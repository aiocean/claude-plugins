# The seven report spines

**Settles:** for one chosen spine — its numbered sections in document order, what each section
contains, the sentence that makes each section fail, its dominant transition value for the
contract's `Transition=`, and the evidence class backing it.

**Read one section, not the file.** The selector in
`skills/aio-html-report/references/report-structures.md` names exactly one spine before this
file opens. Each `###` below is complete on its own and shares nothing with its neighbours, so
the named spine is roughly 2.4 KB out of the 33 KB here. Reading all seven loads six spines the
report will not use.

A report whose subject is latency, an experiment, a rollout, or a benchmark also opens exactly one
`###` from `Four data-narrative skeletons` at the end of this file — 2.6 to 4.3 KB, chosen by the
table there — which supplies that subject's evidence sections inside the spine already selected.

| Spine | Read this section when the selector returned |
|---|---|
| VERDICT | code review, PR writeup, audit, "is this safe to merge" |
| INCIDENT | an outage, a regression, a failure with a start and end time |
| EXPLAINER | how something works, or a reader new to it |
| DECISION RECORD | a decision already made, or an implementation plan |
| STATUS / PROGRESS | weekly, sprint, status, progress over a period |
| SYNTHESIS | what is known about a subject, across sources |
| OPEN QUESTION | the answer is not known yet, or the evidence is contested |

Evidence class is marked per spine: [MEASURED] a published study backs the shape,
[DOCTRINE] an institution mandates it in a retrievable standard, [CONVENTION] widely used,
no measurement. Nothing here is marked [MEASURED] on the strength of a blog post.

## The seven spines

Each spine names its dominant transition — the value that goes in the contract's `Transition=` — and its evidence class. The section numbers are the section order in the document.

### VERDICT — code review, PR writeup, audit

Dominant transition: general→specific · [DOCTRINE + MEASURED]

| # | Section | Must contain / fails when |
|---|---|---|
| 1 | Verdict | One decision token — `Approve` / `Approve with nits` / `Request changes: N blocking` — plus LOC reviewed and what was **not** reviewed. **Fails when** it says "looks good overall" instead of a token, or omits the coverage clause, because silence about an unexamined file reads as "clean". |
| 2 | What this change does | Current behaviour → new behaviour, stated as behaviour a user or caller observes, not as a diff narration. **Fails when** it says "adds a function to X" — that is the diff, which the reader already has. |
| 3 | Blockers | One block per finding, severity-ordered, each: label + `file:line` + the decisive lines inline + the fix as a command verb. **Fails when** two blockers are joined by "therefore" — findings are independent siblings, and one wrong finding must not void the verdict. |
| 4 | Non-blocking notes | Same shape, explicitly downgraded, each stating why it is not blocking. **Fails when** nits sit unlabelled among blockers, which forces the reader to re-triage the whole list. |
| 5 | Coverage | A table of the twelve review aspects — Design, Functionality, Complexity, Tests, Naming, Comments, Style, Consistency, Documentation, Every-line, Context, Good-things — each marked examined or not, with a reason. **Fails when** an unexamined aspect is silently absent. |
| 6 | Tests and verification | The command run, its output, and the test that fails before and passes after. **Fails when** it asserts "tests pass" with no command and no output. |
| 7 | What would change this verdict | The falsifier: "If `<observation>`, §1 flips to `<other token>`." **Fails when** absent — an unfalsifiable verdict is a preference. |

*Backing: Google eng-practices supplies §5's twelve aspects and the code-as-subject rule verbatim. Conventional Comments supplies §3/§4's `<label> [decorations]: <subject>` grammar. Cisco/SmartBear (2,500 reviews, 3.2M LOC, 50 developers, 10 months) supplies §1's coverage thresholds — 100–300 LOC target, 400 hard cap, 30–60 min, 5 min minimum, and the finding that reviews with at least one author-preparation comment never exceeded 30 defects/kLOC, which is why §2 is the author's, not the reviewer's. Bosu et al. (Microsoft, ~1.5M comments) measured 65.5% comment usefulness and the command-verb effect behind §3's fix phrasing. The independent-siblings rule in §3 is Minto's inductive grouping — note the [CONVENTION] label: the inductive-at-top-level advice comes from Millerd's summary blog, framed there as his own advice for beginners, not from Minto's text.*

The same spine rendered as the headings of a PR writeup, the most common request this skill receives:

```
h1  <PR title> ships <capability>, but <the one blocking problem>
h2  <file:line> <verb>s <the bug> — <consequence>            [blocking]
h2  <n> call sites still <verb> the old contract             [blocking]
h2  The new <thing> duplicates <existing thing> at <path>    [non-blocking]
h2  Tests cover the happy path only; <named case> is untested
h2  Reviewed 312 of 480 changed lines; generated protobufs skipped
h2  Ship it after fixing <the one blocker>
```

### INCIDENT

Dominant transition: chronological · [CONVENTION, with one measured constraint]

| # | Section | Must contain / fails when |
|---|---|---|
| 1 | Current state | Is it over, mitigated, or ongoing — stated in the first six words. **Fails when** the reader has to scroll to learn whether the fire is out. |
| 2 | Impact | Who was affected, how many, for how long, in what unit the business uses. **Fails when** it reports error rate instead of affected users. |
| 3 | Timeline | Timestamped observations only. No causes. **Fails when** a causal verb appears — the timeline is what was seen, and mixing it with cause makes the reconstruction unfalsifiable. |
| 4 | Causal chain | Cause → effect links, each carrying the observation that supports the link. **Fails when** a link has no observation, or when the chain is a restated timeline. |
| 5 | Contributing conditions | What made this failure possible and would make the next one possible. **Fails when** it names a person. |
| 6 | Response evaluation | What the responders knew at each decision point and what they worked from. **Fails when** it contains "should have", "failed to", "obviously" — the existing `ev.counterfactual` check fires on these. |
| 7 | Corrective actions | Owner, action, date, and the class of failure each one closes. **Fails when** an action has no owner or no date. |
| 8 | Detection gaps | How long until anyone knew, and what would have shortened it. **Fails when** absent — detection is the only lever that shortens every future incident. |

*Backing: the chronology/causality split and the blameless framing are [CONVENTION] — no retrieved study measures them. The one measured constraint is linguistic, from §6: passive voice is **correct** here while the agent is unknown ("The connection pool was exhausted at 03:14"), and forcing active voice invents an agent. The ruling with its four legitimate uses is in
`references/copy-delint.md`, "The passive-voice ruling", routed from the SKILL.md.*

### EXPLAINER — technical explanation for someone new to it

Dominant transition: general→specific · [MEASURED for §3, DOCTRINE for the exclusions]

| # | Section | Must contain / fails when |
|---|---|---|
| 0 | Title | Reads correctly with an implicit "About" prefix. **Fails when** it is a task title ("Setting up auth") — that is a how-to, and this spine is the wrong shape for it. |
| 1 | What this is and what it is for | The job this subsystem does, in the vocabulary of the business, and who calls it. **Fails when** it opens on the tech stack. |
| 2 | The mental model | Three to five named concepts, one line each, and one diagram of how they relate. **Fails when** a name used later in the document was never defined here. |
| 3 | The worked trace | One real input followed end to end with **real values at every hop**, each hop naming its file and function. **Fails when** it is abstract ("the request is validated"), and **fails differently** when it is not collapsible — for an expert reader the full trace measurably hurts. |
| 4 | Why it is built this way | "The reason for X is that historically, Y." **Fails when** it justifies the present without naming what came before. |
| 5 | Alternatives and why not | Two or three approaches a competent engineer would expect, each with the specific constraint that ruled it out. **Fails when** absent. |
| 6 | Where it breaks | The invariant that must hold, and the conditions under which the model in §2 stops being true. **Fails when** it lists error codes — that is reference, and it belongs in an appendix. |
| 7 | Connections | What changes elsewhere when this changes. **Fails when** the document ends at its own module boundary. |
| 8 | What this document is not | One line pointing at the how-to and the reference. **Fails when** setup steps have leaked into §1–§7. |

*Backing: §3 is the worked-example effect — learners studying worked examples outperformed learners solving problems (Sweller & Cooper); the collapsibility requirement is the expertise-reversal effect, where worked examples "often resulted in negative effects for more knowledgeable learners" (Kalyuga et al. 2000/2001). §4/§5/§8 are Diátaxis explanation, which states that explanation "can and must consider alternatives, counter-examples or multiple different approaches" and prohibits instruction and reference inside it. Apply the Diátaxis discriminator to every drafted section: "is this something someone would turn to while working … or is it something they'd need once they have stepped away from the work?" If the reader would have it open while typing, it is reference — move it.*

This is the spine an explainer request takes, and it is the reading the contract's three answer keys carry there: `Verdict=` is the one-sentence answer the reader repeats back, `Consequence=` is what the reader can do afterwards, `Challenge=` is the misreading a newcomer arrives with. Material with no numeric series ships the diagram or the annotated code named in `Visuals=`, and no chart.

### DECISION RECORD

Deductive at §6 · [DOCTRINE — two published templates]

| # | Section | Must contain / fails when |
|---|---|---|
| 1 | Title + status | Short noun phrase naming problem **and** solution; status one of `proposed / rejected / accepted / deprecated / superseded by <id>`. **Fails when** the title names only the chosen technology, which hides the problem. |
| 2 | Context and problem statement | The forces at play — technological, political, social, project-local — stated value-neutrally, scope explicit. **Fails when** a reader who reads only this section can guess §6. Advocacy in Context is the signature of a rationalization. |
| 3 | Decision drivers | The criteria, enumerated **before** any option is described, each observable or measurable. **Fails when** a driver appears in §6 that is absent here — that is a retrofitted criterion. |
| 4 | Considered options | At least two named options plus the do-nothing option, each a title its proponent would recognise. **Fails when** one option gets two sentences and the winner gets two pages. |
| 5 | Pros and cons | Per option, literal `Good, because …` / `Neutral, because …` / `Bad, because …`, scored against §3 only. **Fails when** any option has zero "Good, because" lines — that is a strawman. |
| 6 | Decision outcome | Literal: `Chosen option: "<title>", because <driver from §3>.` Then the decision as `We will …` in active voice. **Fails when** written as "it was decided". |
| 7 | Consequences | Positive, negative and neutral. **Fails when** all-positive — Nygard: "All consequences should be listed here, not just the 'positive' ones." |
| 8 | Confirmation | How compliance will be verified: the test, the lint rule, the review gate, the metric and its threshold. **Fails when** absent — a decision with no fitness function cannot later be shown to have been followed. |
| 9 | Drawbacks / impact of not doing this | The author argues against their own recommendation, and states what happens if nothing changes. **Fails when** the document never contains a sentence hostile to its own conclusion. |
| 10 | Unresolved questions | What is deliberately still open, and when each settles. **Fails when** empty on a non-trivial decision — that claims omniscience. |

*Backing: §1–§8 are MADR 4.0.0 (released 17 Sep 2024) section-for-section, with §2/§6/§7 wording from Nygard's original 2011 post. §9 and §10 are the Rust RFC template's Drawbacks and Unresolved-questions sections, added because MADR lacks both and they are the two sections a generated decision doc omits by reflex.*

### STATUS / PROGRESS

Dominant transition: chronological · [DOCTRINE for the opener, CONVENTION for the rest]

| # | Section | Must contain / fails when |
|---|---|---|
| 0 | Intent tag | One of `ACTION` / `DECISION` / `REQUEST` / `INFO`, so the reader learns in one glance whether they are on the hook. **Fails when** absent. |
| 1 | BLUF | One sentence: who needs what from whom by when. **Fails when** it is an agenda, a period label, or a restatement of the request. |
| 2 | Trajectory | On track / at risk / slipped, and the one factor that decides it. **Fails when** it reports percentage complete with no factor. |
| 3 | What materially changed | Only changes that alter what someone else must do. **Fails when** it becomes an activity inventory — work performed with no consequence stated. |
| 4 | Shipped outcomes | Outcomes in the reader's units, each with the evidence it shipped. **Fails when** it lists merged PRs. |
| 5 | Risk and carryover | Top two risks with owner and mitigation, plus what moved to next period and why. **Fails when** a risk has no owner. |
| 6 | Decisions or help needed | The literal choice being asked for, with the consequence of each branch. **Fails when** the document ends on "let me know". |
| 7 | Next horizon | What the next period buys, in one line. **Fails when** it is a task list. |

*Backing: §0's keyword set (ACTION / SIGN / INFO / DECISION / REQUEST / COORD) and the actor-action-deadline BLUF sentence come from the HBR piece "How to Write Email with Military Precision" (hbr.org/2016/11/…, HTTP 200) — **not** from the Wikipedia BLUF article, which names only three keywords (info, request, action) and contains no flyer example. §1's numeric discipline is AR 25-50 para 1-39: average sentence about 15 words, no paragraph over 10 lines, one page for the main memo with detail in enclosures, and never open a sentence with "It is", "There is", "There are".*

### SYNTHESIS — research across sources

Dominant transition: general→specific · [DOCTRINE for §1]

| # | Section | Must contain / fails when |
|---|---|---|
| 1 | Answer / abstract | Complete in itself: comprehensible if extracted and published alone, containing no citations and no cross-references, and textually different from §2. **Fails when** it is §2's opening paragraphs copied forward, or when it states the topic ("This document examines caching options") instead of the answer. |
| 2 | What is established | Verified facts only, each with an anchor. Nothing inferred. **Fails when** an inference is filed here. |
| 3 | Competing explanations | A MECE set including an explicit "none of the above", each stating the observation it predicts. **Fails when** two explanations predict the same observation — then they are one explanation. |
| 4 | The discriminating test | "Run T. Observing O1 → H1 survives; O2 → the reverse." **Fails when** an explanation has no discriminating observation; label that one a guess. |
| 5 | What the evidence does not support | Named claims the sources are commonly read as making and do not. **Fails when** absent. |
| 6 | Open questions | What could not be resolved and what would resolve it. **Fails when** it says "further research is needed". |
| 7 | Source register | Every source with retrieval date and what it licenses the document to assert. **Fails when** a source appears here that no section cites. |

*Backing: §1 is RFC 7322 §4.3 verbatim — abstract "must not contain citations", must be "complete in itself", and copying the Introduction's opening paragraphs is discouraged. Note the correction: RFC 7322 marks IANA Considerations "[Required in I-D]", not required in the published RFC. §3–§4 are convention drawn from hypothesis-testing practice, not from a text-structure study.*

### OPEN QUESTION — the answer is not known

Dominant transition: problem→solution · [CONVENTION]

| # | Section | Must contain / fails when |
|---|---|---|
| 1 | The question | One interrogative sentence, ≤20 words. It is also the document title. **Fails when** it contains "and" — that is two documents. |
| 2 | Current best answer + confidence | "Most likely X. `<ICD 203 term>` (`band`). If forced to decide today, we would Y." **Fails when** the confidence word carries no band, or when the wording is indistinguishable from a VERDICT spine's §1. |
| 3 | What is established | Verified observations only, each anchored. **Fails when** it contains an inference. |
| 4 | Competing hypotheses | MECE, including "none of the above", each stating the observation it predicts. **Fails when** one hypothesis is obviously the author's and the rest are decoration. |
| 5 | The discriminating test | The test, and what each outcome kills. **Fails when** absent — this section is the spine's centre of gravity, not an afterthought. |
| 6 | Deciding anyway | What is reversible, what is not, and which actions are safe under **every** surviving hypothesis. Do those now. **Fails when** it recommends waiting with no safe action named. |
| 7 | What we still need | Access, data, time, or a decision from a named person. **Fails when** vague. |

> Swapping OPEN QUESTION for VERDICT without changing the confidence language is the single most common dishonesty in a generated document. If §2 could be pasted into a VERDICT spine's §1 unchanged, it is over-claiming.

The seven confidence terms and their bands for §2 are in `references/evidence-and-confidence.md`; the band travels beside the word as literal text.

## Four data-narrative skeletons

A skeleton composes with a spine: the spine settles what the document argues and where its verdict
sits, the skeleton settles which numbers earn a section and how each one fails. Open exactly one
row below, and only when the report's subject is that row's subject.

| Skeleton | Open it when the report is about | Spine it sits inside |
|---|---|---|
| LATENCY / RELIABILITY | response time, availability, error budget, an SLO under pressure | INCIDENT or STATUS |
| EXPERIMENT READOUT | an A/B test, a holdback, a flag experiment with a decision waiting on it | DECISION RECORD or OPEN QUESTION |
| ROLLOUT / MIGRATION | a staged release, a flag ramp, a data or system migration in flight | STATUS |
| BENCHMARK | throughput, allocation, build time, cost per unit, measured against a baseline | VERDICT or DECISION RECORD |

Evidence class is marked per skeleton on the same scale used above: [MEASURED], [DOCTRINE],
[CONVENTION].

### LATENCY / RELIABILITY

Dominant transition: general→specific · [DOCTRINE — Google SRE book and workbook]

| # | Section | Must contain / fails when |
|---|---|---|
| 1 | The SLI, spelled out | The workbook's own sentence shape: "The proportion of sufficiently fast requests, as measured from the load balancer metrics. 'Sufficiently fast' is defined as < 400 ms", plus the measurement point and the window. **Fails when** the word "latency" appears with no threshold, no measurement point, and no window — three readers then hold three different metrics. |
| 2 | Position against the SLO | The objective (the workbook's example: 90% < 400 ms, 99% < 850 ms), attainment over the stated window, and error budget remaining as a fraction of the window. **Fails when** it reports an average, which is a value no request experienced. |
| 3 | The distribution | p50, p95 or p99, and the maximum as separate series, each labelled with its aggregation window. **Fails when** one percentile stands in for the distribution, or when percentiles from several servers or minutes are averaged rather than recomputed from merged histograms. |
| 4 | What moved, and when | Deploys, config changes, and traffic shifts marked on the same time axis as §3. **Fails when** a change is narrated in prose with no timestamp, since the reader cannot line it up with the curve. |
| 5 | Burn rate and its consequence | The burn rate over each window with the action it triggers — page at 14.4 over 1 h (2% of a 30-day budget), page at 6 over 6 h (5%), ticket at 1 over 3 days (10%), short window one twelfth of the long one. **Fails when** it reports budget spent with no page-or-ticket consequence attached. |
| 6 | Measurement caveats | The coordinated-omission sentence from `references/encoding-and-charts.md`, plus sampling rate and clock source. **Fails when** absent — wrk2's own example reads an uncorrected p99 of 6.04 ms where the corrected figure is 1.27 s, about 210×, so the caveat carries three orders of magnitude. |
| 7 | Action the budget forces | The error-budget policy consequence with owner and date: a single incident consuming more than 20% of the four-week budget gets a postmortem; a single class of outage consuming more than 20% of the quarterly budget gets a P0 planning item; an exhausted budget halts feature pushes for four weeks. **Fails when** it ends on continued monitoring, which is the state it was already in. |

**It is a latency report when it shows** the threshold, the window, and the measurement point without the reader asking; the tail and the median as separate series; and the budget consequence with a name against it. Reporting the tail with no threshold makes it a metrics dump. Reporting attainment with no distribution makes it a status line.

*Backing: §1–§2 are the SRE workbook's SLO document (sre.google/workbook/slo-document), whose worked SLI and its 400 ms / 850 ms objectives are quoted above. §3's percentile reasoning and its window labels are the SRE book's Service Level Objectives chapter. §5's numbers are workbook Table 5-8 and the one-twelfth short-window guideline. §7 is the workbook's error budget policy, which carries both the four-week incident rule and the separate quarterly class-of-outage rule. §6's ratio is measured, from wrk2's README example under a 1.4 s stall.*

### EXPERIMENT READOUT

Deductive at §7 · [DOCTRINE for §1, §3 and §8; CONVENTION for the section order]

| # | Section | Must contain / fails when |
|---|---|---|
| 1 | Hypothesis and decision rule, as registered | The literal block below, carrying the timestamp and commit that predate the first data read. **Fails when** the rule is written in the past tense beside the result — a decision rule that appears after the number is a rationalization of it. |
| 2 | What shipped to whom | Variant definitions, unit of randomization, the trigger condition that decides who counts as exposed, and the dates. **Fails when** the trigger condition is missing, since triggered impact and diluted impact are two different numbers and the reader cannot tell which one §4 reports. |
| 3 | Trust checks, before any result | Sample-ratio mismatch, data-quality metrics (error rates, data loss rates, join rates), and segment stability. **Fails when** an effect appears above a failed SRM, which makes every number below it a number from a broken assignment. |
| 4 | The primary metric | Effect size, its interval, and n per arm, read once at the pre-registered end of the run. **Fails when** it reports a point estimate alone, or a p-value with no effect size, or an interim peek presented as the result. |
| 5 | Guardrails | Each guardrail with its pre-registered threshold beside its observed movement — page load time, crash rate, abandonment rate. **Fails when** only the metrics that moved favourably are listed, which turns a readout into a highlight reel. |
| 6 | Segments | The segments declared in §1, with the multiple-comparison correction named. **Fails when** a segment introduced after the data arrives is read as a finding. |
| 7 | Decision against §1 | Ship, hold, or iterate, quoting §1's rule verbatim and showing the observed numbers against it. **Fails when** the decision cites a criterion that is absent from §1. |
| 8 | What this experiment does not license | Dilution to the full population, the novelty and primacy window, seasonality, and the population tested. **Fails when** absent — the diluted number is what the business feels, and the triggered number is what §4 measured. |

**It is a readout when it shows** a rule that predates the data, an assignment checked before the effect is read, and an interval travelling with every effect. A rule written after the numbers makes it an argument. A missing guardrail row makes it a highlight reel.

```html
<section class="decision-rule" id="rule-checkout-2026-08-06">
  <h2>Decision rule — fixed 2026-08-06T09:12Z at commit a4f19c2, before any data was read</h2>
  <dl>
    <dt>Hypothesis</dt><dd>Inlining the address form raises completed checkouts per exposed session.</dd>
    <dt>Primary metric (OEC)</dt><dd>completed checkouts per exposed session</dd>
    <dt>Ship when</dt><dd>the 95% interval on the primary metric excludes zero and its lower bound sits above −0.2%, and every guardrail holds</dd>
    <dt>Guardrails</dt><dd>p95 page load ≤ +50 ms · crash rate ≤ +0.05 pp · abandonment ≤ +0.3 pp</dd>
    <dt>Stop early when</dt><dd>sample-ratio mismatch at p &lt; 0.001, or join rate falls below 0.98</dd>
    <dt>Duration</dt><dd>14 days, fixed in advance; the readout is written after day 14 whatever the interim values show</dd>
    <dt>Segments declared in advance</dt><dd>new vs returning · mobile vs desktop — Bonferroni across the two</dd>
  </dl>
</section>
```

*Backing: §1's pre-registration is Booking.com's CODE@MIT 2017 paper, which requires that owners "specify up front which customer behavior they want to impact and how, the set of metrics which is going to support their hypothesis, and how these metrics are going to change", reporting that this "considerably reduces p-hacking". §3, §5 and §6 are Microsoft EXP's trustworthy-experimentation patterns for the experiment stage, which name SRM, the data-quality metric taxonomy quoted above, the early-peeking correction, and the guardrail examples. §8 is the same series' post-experiment article, on triggered analysis and dilution. The requirement that one readout carry all three metric classes at once is this plugin's composition of those sources [CONVENTION], not a sentence any of them writes.*

### ROLLOUT / MIGRATION

Dominant transition: chronological · [DOCTRINE for §2 and §4, CONVENTION for the order]

| # | Section | Must contain / fails when |
|---|---|---|
| 1 | What changes for whom, and the way back | Old behaviour → new behaviour as a caller observes it, plus the revert path and its blast radius. **Fails when** the revert is a redeploy of the previous build, since that also reverts everything else that shipped with it. |
| 2 | The gate, stated in advance | The literal block below, timestamped before the first stage opened. **Fails when** the advance-and-rollback numbers are written up after a stage has already run. |
| 3 | The stage ladder | Population per stage and dwell time per stage — machines in one datacenter, then that datacenter, then global; flags ramping in the 1 to 10 percent band. **Fails when** a stage advances faster than the slowest signal's window, which ships the next stage before the last one has a measurement. |
| 4 | Canary against a concurrent control | Canary and control populations sized to be representative, running in the same hours, scored on absolute SLO thresholds, on no more than about a dozen metrics. **Fails when** the comparison is against yesterday — time is one of the biggest sources of change in observed metrics, so a before-and-after comparison attributes the day to the deploy. |
| 5 | Where the migration stands | Counts per population: on the old path, on the new path, dual-writing, backfilling, stuck. **Fails when** it reports percent complete with no denominator, which hides whether the remainder is the easy tail or the hard one. |
| 6 | What fired, and what was done | Every gate trip, rollback, and granted exception with its time and the signal that caused it. **Fails when** a rollback appears with no trigger named, since the next stage then repeats it. |
| 7 | Decommission | The date the old path turns off, its owner, and everything still reading from it. **Fails when** absent — a migration with no removal date is a permanent second system. |
| 8 | Carryover risk | What is still unproven at 100%, and the population it lands on. **Fails when** it restates §6 rather than naming an open exposure. |

**It is a rollout narrative when it shows** the stage the change is in, the number that sends it back a stage, and the date the old path goes away. Without a concurrent control it is a before-and-after story. Without a decommission date it is a fork.

```html
<section class="decision-rule" id="gate-v271-2026-08-11">
  <h2>Rollout gate — fixed 2026-08-11T14:00Z at commit 7c3d081, before stage 1 opened</h2>
  <dl>
    <dt>Stages</dt><dd>1% → 10% → 50% → 100%, one stage per 24 h, canary and control served in the same hours</dd>
    <dt>Advance when</dt><dd>canary p99 ≤ 850 ms and canary error ratio ≤ control + 0.1 pp, over a full 24 h stage</dd>
    <dt>Roll back when</dt><dd>the 1 h burn rate exceeds 14.4, or canary crash rate exceeds control by 0.05 pp</dd>
    <dt>Revert path</dt><dd>flag <code>checkout.inline_address=false</code>, independent of the binary, effective within 60 s</dd>
    <dt>Scored metrics</dt><dd>p99 latency · error ratio · crash rate · checkout completion — four, against absolute SLO thresholds</dd>
    <dt>Owner on call</dt><dd>name, for the whole ramp, with authority to roll back without escalation</dd>
    <dt>Decommission</dt><dd>old path removed 2026-09-15, owner named</dd>
  </dl>
</section>
```

*Backing: §4 is the SRE workbook's canarying chapter — canary and control populations "sizeable and last long enough to be representative", scored on "absolute measures, such as defined SLOs", limited to "the top few metrics to use in canary evaluations (perhaps no more than a dozen)", with the instruction to "pause and roll back the deployment" on a trip, and the explicit rejection of before-and-after comparison because "time is one of the biggest sources of change in observed metrics". §3's ladder and the 1-to-10-percent flag band with an independently revertible flag are the SRE book's Reliable Product Launches chapter, which also grounds the gate's questions in launch history — importance substantiated "ideally by a previous launch disaster". §2's burn-rate trigger reuses the LATENCY skeleton's §5. §1, §5, §7 and §8 are [CONVENTION].*

### BENCHMARK

Dominant transition: dimension-walk · [CONVENTION, with one measured constraint]

| # | Section | Must contain / fails when |
|---|---|---|
| 1 | The question and the decision on it | One sentence naming the workload, the system under test, and the decision waiting on the number. **Fails when** the title is a library name and a figure, which measures something with no one waiting for it. |
| 2 | Environment | The disclosure block from `references/encoding-and-charts.md`: hardware, kernel, runtime version, corpus revision, and the resource limits in force. **Fails when** one version line is missing, since the run stops being repeatable at that line. |
| 3 | Baseline | What the number is measured against, run in the same session on the same host with the arms interleaved. **Fails when** the baseline is quoted from an earlier report, which folds machine drift into the reported effect. |
| 4 | Distribution across runs | n, median, min, max, and spread for every arm. **Fails when** a single run is reported as the result, because the spread is the only evidence that the difference outlives the noise. |
| 5 | The comparison | One dimension changed per comparison — version, or workload, or hardware. **Fails when** version and workload move together, since the effect then belongs to neither. |
| 6 | Measurement caveats | Warm-up, cache state, GC or JIT behaviour, clock source, and for any latency figure the coordinated-omission sentence. **Fails when** absent — wrk2's example reads an uncorrected p99 of 6.04 ms against a corrected 1.27 s, about 210×. |
| 7 | What this benchmark does not claim | The corpus, the host, and the questions the run leaves open. **Fails when** the summary generalises past the corpus and the host it ran on. |

**It is a benchmark report when it shows** enough in §2 and §3 for a reader to rerun it, the spread beside the median, and a named question in §7 that the run leaves open. A single run makes it an anecdote. A baseline from another host makes it a spec sheet.

*Backing: [CONVENTION] — no retrieved study measures this shape. The one measured constraint is §6's ratio, from wrk2's README, where a 1.4 s stall on httpd reads as an uncorrected p99 of 6.04 ms against a corrected 1.27 s, about 210× [MEASURED]. §5's one-dimension discipline is an attribution argument, and it has a reader-side analogue rather than a proof: Hullman et al. 2013 measured preference dropping from a one-dimension change to a two-dimension change and then flattening between two and three (n=143, MTurk) — a study of chart sequences, not of benchmark attribution.*
