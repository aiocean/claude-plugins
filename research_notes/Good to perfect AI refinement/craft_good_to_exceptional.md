# Human craft practice for the last stretch of quality, stopping tests, and per-artifact excellence dimensions (good to perfect)

> Coverage: 30 web searches (result summaries read) and 24 fetch attempts. 15 fetches returned readable primary or near-primary text (Quote Investigator, Vitsoe, Frontiers 2019, four arXiv abstracts, LSE repository, Project Gutenberg Strunk, NN/g, Stanford Ousterhout page, ICD 203 PDF via pdftotext, and others). 9 fetches failed or returned nothing usable (HBR paywall, Nature, PMC, bartleby 403, Jim Hill 403, Emory PDF empty, 3 redirect hops). Claims resting on search-result summaries only are labeled MEDIUM or LOW. Three local files were also read: the earlier report, the earlier notes, and `aio-code-review/SKILL.md`. Confidence labels: HIGH = read in a fetched primary or near-primary page this session; MEDIUM = consistent secondary sources or search summaries, or inferred; LOW = single weak source or guess.
>
> Claims about how a practice behaves when run by a single AI agent are the researcher's inferences and sit in the Inferences blocks. The cited findings establish only the human-side facts.

---

## 1. Practices for taking good work to exceptional: mechanism, evidence, failure modes, and transfer to one AI agent in one session

### Takeaway
The practices with real support are subtraction, comparison against exemplars, a structured feedback loop, and ordering the passes. The popular slogans (plussing, marginal gains, "good is the enemy of great") have no controlled outcome evidence. The one finding that matters most for an AI: both humans and LLMs default to adding rather than removing, and the instruction "improve" pushes GPT-4 further toward adding. A "make it perfect" pass therefore has to be subtraction-first by design.

### Cited Findings

**Plussing, Braintrust, dailies**
- Plussing means building on an idea instead of shutting it down. The story-meeting example: instead of "I don't like Woody's eye rolls", a colleague says "I like the way you drew Woody's eyes. What if they rolled left?" It borrows from improv, where partners accept offers and build on them. — [LeadX](https://leadx.org/articles/pixar/); [Jim Hill Media](https://jimhillmedia.com/the-pixar-way-part-ii-lessons-learned/?amp=1) — MEDIUM (search summaries; I did not read the pages).
- Origin is disputed. Walt Disney is quoted as wanting a park "something I could keep PLUSSING with ideas" ([CustomerThink](https://customerthink.com/walter_elias_disney_and_the_plus_factor/)). Another source ties a film-era coinage to *Who Framed Roger Rabbit*. — MEDIUM; sources conflict and I could not resolve it.
- Braintrust rules, quoted from Catmull: "the Braintrust should have no authority"; "everyone could be extremely candid without anyone feeling attacked"; and the idea-handling rule "Don't judge the ideas until you have to." — [First Round Review](https://review.firstround.com/Spark-Creativity-with-These-Tips-from-Pixars-President) — HIGH (fetched text).
- Directors are told they need not follow any note: "You don't have to listen to anyone's notes, not even ours" (Catmull, as relayed in a search-result summary; the underlying page was not identified among the results, which included [Bright Lights Film](https://brightlightsfilm.com/after-lasseter-how-pixar-was-transformed-through-disney-covid-and-management-shakeup/) and an NBC Bay Area piece). — LOW-MEDIUM. The First Round "no authority" quote above supports the same point at HIGH.
- Effectiveness evidence: none found. All support is founder testimony. The earlier notes reached the same conclusion — [earlier notes F](file:///Users/firegroup/projects/claude-plugins/research_notes/AI%20post%20task%20bar%20raising%20skill/quality_frameworks.md) — MEDIUM. The origin story conflicts: Toy Story ([LeadX](https://leadx.org/articles/pixar/)) versus Toy Story 2 (earlier notes).
- Failure mode: a dissent-free, advisory group depends on the director's judgment to accept or reject each note. No failure-mode data found.

**Exemplar study, benchmarking, reference-track A/B**
- Mastering practice: A/B the master against commercial references at matched loudness. A 1 dB level difference can make one version "win" regardless of quality; match perceived loudness (LUFS), switch quickly because "your ears forget the details", and use two or three references in the genre. — [PureMix](https://www.puremix.com/blog/how-to-use-reference-tracks-when-mixing); [Waves](https://waves.com/science-mix-referencing-5-step-method); [ADPTR MetricAB review](https://violetrecording.com/adptr-metric-ab-review/) — MEDIUM (vendor sources with a commercial interest; I read search summaries only).
- Cognitive support for comparing: business students who compared two cases were "nearly three times" as likely to apply the strategy in a real negotiation as students who studied the same cases separately (Loewenstein, Thompson, Gentner 1999; replicated in Thompson et al. 2000 with the same pattern). — [Kellogg record](https://www.kellogg.northwestern.edu/academics-research/research/detail/1999/analogical-encoding-facilitates-knowledge-transfer-in-negotiation/) — MEDIUM (abstract-level; sample sizes not seen). The evidence is on learning and transfer of a principle, not on the quality of a finished artifact.
- Failure mode: the reference sets the ceiling, and a mismatched reference (wrong genre, different loudness) misleads. A rule of thumb from the ADPTR vendor page: you are done when the master "holds up tonally and dynamically" against professional releases. — [ADPTR](https://violetrecording.com/adptr-metric-ab-review/) — LOW (one vendor).

**Subtractive refinement**
- Saint-Exupéry's sentence is hedged in French: "Il semble que la perfection soit atteinte non quand il n'y a plus rien à ajouter, mais quand il n'y a plus rien à retrancher." It is from *Terre des hommes* (1939); Galantière's English (*Wind, Sand and Stars*) reads "In anything at all, perfection is finally attained not when there is no longer anything to add, but when there is no longer anything to take away." The popular "designer knows he has achieved perfection…" form is a later paraphrase, not the book's wording. — [Hacker's Dictionary entry](https://lysator.liu.se/hackdict/split/elegant.html); [Today in Science](https://todayinsci.com/S/SaintExupery_Antoine/SaintExuperyAntoine-Quotations.htm) — MEDIUM (secondary quotation sites agree; no page-level citation to the book).
- Strunk, Rule 13, verbatim: "Vigorous writing is concise. A sentence should contain no unnecessary words, a paragraph no unnecessary sentences, for the same reason that a drawing should have no unnecessary lines and a machine no unnecessary parts. This requires not that the writer make all his sentences short … but that he make every word tell." — [Project Gutenberg, Elements of Style](https://www.gutenberg.org/files/37134/37134-h/37134-h.htm) — HIGH.
- Rams' principle 10 is "Good design is as little design as possible": focus on the essentials, and the page's own summary is "Less, but better." Principle 8, "thorough down to the last detail", says nothing should be arbitrary or left to chance. — [Vitsœ](https://vitsoe.com/gb/about/good-design) — HIGH.
- Zinsser: "Clutter is the disease of American writing. We are a society strangling in unnecessary words, circular constructions, pompous frills and meaningless jargon." — [Publication Coach quoting On Writing Well](https://www.publicationcoach.com/?p=5874) — HIGH for the quote text; the publisher blurb says the book encourages cutting a first draft "by as much as 50 percent" ([Perlego listing](https://www.perlego.com/book/590981/on-writing-well-30th-anniversary-edition-pdf)) — LOW (blurb, not book text).
- Stephen King's cut rule: a 1966 editor's rejection note read "2nd Draft = 1st Draft − 10%"; King taped it by his typewriter and argues that if you cannot cut ten percent while keeping the story's basic flavor "you're not trying very hard". The commentary says 10% is a starting point after cutting unneeded scenes, characters and dialogue. — [NZIBS summary of On Writing](https://blog.nzibs.co.nz/writing/ways-to-instantly-tighten-your-fiction/) — MEDIUM. Controlled evidence that a cut-10% pass improves quality: none found.
- Why subtraction needs a forcing rule: in Adams et al. 2021 (Nature 592:258), participants defaulted to additive solutions; in a Lego task 59% added bricks rather than removing the free fix; subtraction was less likely to be found when not prompted, when there was only one chance, and under higher cognitive load. Reported as 1,153 participants across 8 experiments. — [Ole Miss lab page](https://sites.olemiss.edu/scilab/publications/people-systematically-overlook-subtractive-changes); [UVA news](https://news.virginia.edu/node/314276) — MEDIUM (Nature paper blocked; figures from news and lab pages).
- LLMs share the bias. Santagata and De Nobili report "a significant preference for additive changes across all tested models" (GPT-3.5 Turbo, Claude 3.5 Sonnet, Mistral, MathΣtral, Llama 3.1). Examples: Llama 3.1 added letters 97.85% of the time in palindromes; GPT-3.5 Turbo added a brick 76.38% of the time; Mistral 7B produced longer summaries in 59.40% to 75.10% of cases when asked to improve text. — [arXiv 2409.02569](https://arxiv.org/abs/2409.02569) — HIGH (abstract read). Note a search summary of the same paper said Llama 3.1 preferred subtraction on one sandwich task, so "all models on all tasks" is too strong; the abstract wording is the safe quote — MEDIUM on that nuance.
- Uhler et al.: GPT-4 showed "stronger tendency towards additive transformations … than humans"; humans shifted to subtraction when it was more efficient but GPT-4 "exhibited the opposite behavior"; and GPT-4's additive strategies increased when told to "improve" rather than "edit". 4 preregistered experiments, 588 U.S. participants, 680 GPT-4 iterations. — [arXiv 2404.16692](https://arxiv.org/abs/2404.16692) — HIGH (abstract read; effect sizes not on the page). Tasks were spatial and linguistic puzzles, not code or document editing, so transfer to refinement of real artifacts is an inference.
- Failure mode of subtraction: Tufte says erase non-data-ink and redundant data-ink only "within reason". — [Stasko lecture notes on Tufte](https://faculty.cc.gatech.edu/~stasko/7450/13/Notes/tufte.pdf) — MEDIUM (lecture notes, not the book).

**Cold read, time gap, reading aloud**
- Reading aloud helped people catch both contextual and non-contextual errors compared with silent reading (Cushing and Bodner 2022). Participants did not predict the benefit and rated silent and aloud reading the same afterward. The second experiment used texts with only 1-5 errors, mostly grammar and word choice that spell-checkers miss. — [Learning Scientists summary](https://learningscientists.org/blog/2022/10/20-1); [Psychology Today](https://www.psychologytoday.com/us/blog/your-future-self/202204/a-simple-and-effective-cognitive-method-to-catch-typos-and-other) — MEDIUM (summaries; journal details not seen).
- Incubation: a meta-analysis (Sio and Ormerod 2009, Psychological Bulletin 135(1):94-120) found a positive incubation effect, larger for divergent-thinking tasks than for linguistic or visual insight tasks; longer preparation gave a larger effect and demanding filler tasks shrank it. — [PubMed 19210055](https://pubmed.ncbi.nlm.nih.gov/19210055/) — MEDIUM (abstract via search summary; pooled effect size not obtained). These studies are about problem solving, not about re-reading one's own writing.
- A study showing that a time gap before proofreading improves error detection: none found.
- Reverse outline: no effectiveness study found. It is a named practice only.

**Beck, Kernighan and Plauger, level ordering**
- "Make it work, make it right, make it fast" is attributed to Kent Beck, who credits his father. — [Python in a Nutshell, O'Reilly](https://oreilly.com/library/view/python-in-a/0596100469/ch18s04.html) — MEDIUM.
- Kernighan and Plauger's *The Elements of Programming Style* (1974) carries rules including "Make it right before you make it faster" and "Don't diddle code to make it faster – find a better algorithm", plus a rule to instrument programs and measure before efficiency changes. — [Wikipedia](https://en.wikipedia.org/wiki/The_Elements_of_Programming_Style); [rules listing](https://www.miketaylor.org.uk/tmp/eops-rules.html) — MEDIUM (secondary listings; numbering differs by edition).

**Kaizen vs kaikaku**
- Kaizen is small, continuous, worker-driven improvement; kaikaku is radical change of a production system, usually launched by management; mature organisations are said to use both ("kaikaku to reset, kaizen to refine"). — [Wikipedia: Kaikaku](https://www.Wikipedia.org/wiki/Kaikaku); [Fabrico](https://www.fabrico.io/blog/kaizen-vs-kaikaku/); [Quality Gurus](https://www.qualitygurus.com/?p=516204) — MEDIUM. One source claims singular kaizen changes rarely lift major metrics above about 20%. Imai's own text was not located. Outcome evidence comparing the two: none found.

**Deliberate practice (Ericsson)**
- Original criteria as summarized by Ericsson and Harwell: individualized training by a well-qualified teacher; the goal is communicated; the teacher prescribes an activity with immediate feedback on each attempt; the trainee makes "repeated revised attempts that gradually approach the desired goal performance". — [Ericsson and Harwell 2019, Frontiers in Psychology](https://www.frontiersin.org/articles/10.3389/fpsyg.2019.02396/full) — HIGH.
- Effect size is contested. Macnamara et al. 2014: practice explained "only 14% of variance" overall (games 26%, music 21%, sports 18%, education 4%, professions under 1%). Ericsson and Harwell reanalysis: practice duration "explained considerably more variance in performance (29 and 61% after attenuation correction)", arguing Macnamara used a broader "structured practice" definition. — same Frontiers page — HIGH.
- Deliberate practice describes how a person improves across attempts; it is not evidence about polishing a single artifact.

**Marginal gains (Brailsford)**
- The idea: break a task into components and improve each by about 1%. — [Wikipedia: Dave Brailsford](https://en.wikipedia.org/wiki/Dave_Brailsford) — MEDIUM.
- Bradley Wiggins called it "a load of rubbish" in 2017 (opinion, not a test). — [ITV](https://www.itv.com/news/update/2017-03-27/wiggins-brailsfords-marginal-gains-a-load-of-rubbish/) — MEDIUM.
- James Clear's own fact-check page confirms the medal counts but offers no independent evidence that the approach caused the results, and notes unresolved doping controversies (TUEs, Froome salbutamol). — [James Clear](https://jamesclear.com/atomic-habits/cycling) — HIGH (page read). Controlled evidence that aggregated 1% gains compound: none found.

**Collins, "good is the enemy of great"**
- Rosenzweig's critique: heavy reliance on magazine articles introduces halo effects, and selecting "great" companies after the fact cannot separate cause from effect; Levitt noted Circuit City and Fannie Mae later ran into trouble. — [Wikipedia: Good to Great](https://en.wikipedia.org/wiki/Good_to_Great); [Wharton Knowledge](https://knowledge.wharton.upenn.edu/article/the-halo-effect-debunking-some-hot-business-books-with-one-of-his-own/) — MEDIUM (secondary; Levitt's portfolio figure is a single 2001 start point). As evidence for an AI quality pass, the Collins slogan has no usable support.

### Inferences
- **Subtraction-first is the best-evidenced design constraint.** Humans overlook subtraction (Adams), LLMs add more than humans (Uhler, Santagata), and "improve" increases adding (Uhler). A skill whose goal word is "perfect" or "improve" will drift toward additions unless the pass opens with a deletion test. Transfer to editing real code or prose is untested (MEDIUM). Needs neither a fresh context nor a second model, though a fresh reader helps judge whether a cut lost meaning.
- **Plussing transfers as a constraint on how changes are proposed, not as a proven effect.** Mapped to an agent: every proposed change states what existing strength it preserves and what it adds, and nothing is deleted without a stated reason. The effect is unproven (no outcome data). Transfer MEDIUM; no second mind needed.
- **Exemplar comparison transfers well** if the agent retrieves two or three genuinely strong exemplars before judging, and normalizes confounds (length, format, loudness-equivalent) before comparing. The mastering lesson (level-match or you will be fooled) translates to "match scope, length and formatting before declaring one version better". Transfer MEDIUM-HIGH; a fresh-context judge reduces authorship bias.
- **Time gap and cold read translate to a fresh context.** What the time gap does for a human is remove memory of intent. A subagent that sees only the artifact and the reader's goal reproduces that. The incubation literature does not support the claim directly (problem solving, not proofreading). Transfer MEDIUM-LOW; requires a fresh context.
- **Reading aloud has no direct LLM equivalent.** The nearest analog is consuming the artifact in its delivered medium (run it, render it, read it linearly as the user would). The reading-aloud study found people could not tell it helped, which argues for objective detection rather than self-report. Transfer LOW-MEDIUM.
- **Deliberate practice contributes structure, not magnitude.** Its four elements (clear goal, immediate feedback on each attempt, repeated revised attempts toward the goal) match a refinement loop with executed checks. The "practitioner learns across sessions" part is lost in a single session. Transfer of structure MEDIUM, of learning LOW.
- **Kaizen vs kaikaku defines the scope of "good to perfect".** A good-to-perfect pass is kaizen. When the best remaining improvement is a rewrite or re-architecture, that is a different decision and should be surfaced rather than silently executed (consistent with the user's "propose before executing" rule). MEDIUM, because it rests on definitions, not outcome data.
- **Beck/K&P ordering gives a level order** for passes: correctness first, then structure, then economy, then polish and performance, with measurement before any performance change. MEDIUM-HIGH for code, MEDIUM for other artifacts.
- **Marginal gains is useful only as decomposition.** Break "perfect" into measurable dimensions and move each, but make no claim that the sum compounds. LOW-MEDIUM.

### Gaps
- No primary text of *Creativity, Inc.* or the HBR 2008 article was accessible, so the exact definition of plussing and dailies in Catmull's words is unverified; I found no source in this session defining "dailies".
- No controlled outcome evidence found for plussing, Braintrust, cut-10%, reverse outline, time-gap proofreading, marginal gains, or kaizen/kaikaku.
- Mastering evidence is vendor material only. No Bob Katz or Sound on Sound primary was read.
- Imai's *Kaizen* and the Lean Enterprise Institute definitions were not located.
- Beck's and K&P's primary texts were not read.

---

## 2. How masters decide a work is finished, and which stopping tests an AI could apply

### Takeaway
Masters mostly stop by decision, deadline or satisfaction, not by a measurable condition, and the famous aphorisms say so explicitly. The tests an agent can apply with evidence are subtraction (a deletion test), reference parity, "no named improvement survives verification", and a hard cap; the rest are taste.

### Cited Findings
- Valéry attribution: the saying traces to his March 1933 essay "Au sujet du Cimetière marin" in *La Nouvelle Revue Française*, concerning a work (*ouvrage*) in general, not a poem: "un ouvrage n'est jamais achevé … mais abandonné." The compact form was produced by later quotation (Maulnier, May 1933). The "poem" wording appears in Auden's credits to Valéry (1967, 1970); the earliest English instance found is a February 1946 NYT notice quoting "a work is never completed, but merely abandoned". The article treats an Oscar Wilde attribution as implausible and records Cocteau only as a 1965 secondhand link by Gore Vidal. — [Quote Investigator](https://quoteinvestigator.com/2019/03/01/abandon/) — HIGH (page read).
- Hemingway: asked how many times he rewrote the end of *A Farewell to Arms*, the published Paris Review interview reads "thirty-nine times before I was satisfied"; the typescript read "before I got it right" and Plimpton revised both question and answer. Asked what stumped him: "Getting the words right." The 2012 reissue printed 47 alternative endings from the Kennedy Library. — [Morgan Library](https://www.themorgan.org/blog/getting-question-right); [University of Delaware exhibit](https://exhibitions.lib.udel.edu/from-thought-into-print/?p=264); [CBC](https://amp.cbc.ca/lite/story/1.1273101) — MEDIUM-HIGH (several consistent secondary pages; Paris Review text not opened). The stop was a felt state ("satisfied"), not a metric.
- Lasseter on Pixar: "We don't actually finish our films, we release them" — [Goodreads highlight from Essentialism](https://www.goodreads.com/notes/19776547-essentialism/147322067-eric/95f42a02-0772-46e9-ae45-d6218c58f422) — LOW (reader highlight; no interview or transcript found).
- Saint-Exupéry subtraction test: no longer anything to take away (quote details above). — [Hacker's Dictionary](https://lysator.liu.se/hackdict/split/elegant.html) — MEDIUM.
- Rams, principle 8: nothing arbitrary or left to chance. — [Vitsœ](https://vitsoe.com/gb/about/good-design) — HIGH.
- Mastering reference parity: done when the master holds up against professional releases at matched loudness. — [ADPTR review](https://violetrecording.com/adptr-metric-ab-review/) — LOW (single vendor).
- Google's reviewer standard (from the earlier report): approve once a change "definitely improves the overall code health … even if [it] isn't perfect"; "there is no such thing as 'perfect' code"; non-critical comments labeled "Nit:". — [Google eng-practices](https://google.github.io/eng-practices/review/reviewer/standard.html), cited in [the earlier report](file:///Users/firegroup/projects/claude-plugins/reports/AI%20post%20task%20bar%20raising%20skill.md) — HIGH (per earlier report; not re-fetched). The in-repo `aio-code-review/SKILL.md` repeats it: "There is no 'perfect' code, only *better* code. Seek continuous improvement, not polish." — [SKILL.md](file:///Users/firegroup/projects/claude-plugins/plugins/aio-code-review/skills/aio-code-review/SKILL.md) — HIGH (re-read this session).
- Perfectionistic concerns (open-ended self-criticism) add hours with no performance gain; strivings correlate with performance — see Section 4 for numbers. — [Bellam and Curran 2025](https://researchonline.lse.ac.uk/id/eprint/128910/) — HIGH.

### Inferences
Conversion of each stopping test into an agent rule, with whether it is checkable by evidence:

| Stopping test | Agent rule | Evidence-verifiable? |
|---|---|---|
| Valéry, abandoned not finished | Treat "done" as a release decision. End with "released at bar B, with these named leftovers", never "complete". | Yes, trivially (a list exists or not). It carries no quality claim. |
| Saint-Exupéry subtraction | Deletion test: for each element (function, branch, paragraph, UI component, plan step), remove it and check that goal-relevant observables are unchanged. Stop when no element can be removed. | Code: yes (tests, behavior diff). Prose and analysis: partly (a fresh reader answers the same questions). UI: partly. Judging "unchanged" is taste unless observables are chosen up front. |
| Rams, thorough: nothing arbitrary | Every element has a stated reason (spacing from a token, a number from a computation, a name from a convention). Stop when the unexplained list is empty. | Mostly yes (auditable list). Reasons themselves can be weak. |
| "Name a specific improvement" | Stop when a fresh reviewer, asked to name concrete improvements with a predicted observable effect, produces none that an independent check confirms. | Yes in form (confirmation is by execution, measurement or a second reviewer). Weakness: failure to name one is not proof none exists. |
| Reference parity | Stop when, on each dimension, a blind pairwise comparison against 2-3 pre-chosen exemplars at matched conditions rates the work at or above the exemplar. | Partly: pairwise is checkable, but the judge is an LLM or a human with taste. Exemplar choice caps the ceiling. |
| Deadline or budget abandonment | Hard cap on passes and tool calls. Stop at the cap and list leftovers. | Yes, but measures resources, not quality. |
| Diminishing returns | Stop when two consecutive passes yield no verified improvement; a dropping yield per pass is the signal. | Yes for the count; it is an inference, with no sourced threshold. |
| Hemingway's "satisfied" | Not usable. | No, it is taste. |

Which are evidence rather than taste: the deletion test (when observables are fixed in advance), unexplained-element audit, executed ground truth, "improvement confirmed by an independent check", and the cap. Parity and "satisfied" rest on judgment.

### Gaps
- No empirical work on how masters decide a work is done (as opposed to anecdotes, aphorisms and vendor advice).
- No sourced numeric threshold for diminishing returns in revision (see Section 4).
- Saint-Exupéry's original passage context and page citation were not verified.
- The Lasseter "released, not finished" line is not confirmed from a primary source.

---

## 3. Excellence dimensions per artifact type, with an observable test per dimension

### Takeaway
Each type has an established source set. Dimensions are anchored below; the one-line observable tests are the researcher's proposals (inferences, MEDIUM) so that each dimension can drive a rising bar. Sources are strong for code, prose, UI and analysis, and thin for plans.

### Cited Findings (anchor sources)
- Rams' ten principles: innovative, useful, aesthetic, understandable, unobtrusive, honest, long-lasting, thorough down to the last detail, environmentally friendly, as little design as possible. — [Vitsœ](https://vitsoe.com/gb/about/good-design) — HIGH.
- Nielsen's 10 heuristics: visibility of system status; match with the real world; user control and freedom; consistency and standards; error prevention; recognition rather than recall; flexibility and efficiency; aesthetic and minimalist design; help users recognize, diagnose and recover from errors; help and documentation. The page presents them for heuristic evaluation (inspection) and does not compare that method with user testing. — [NN/g](https://www.nngroup.com/articles/ten-usability-heuristics/) — HIGH.
- WCAG 2.2 organizes accessibility around four principles: perceivable, operable, understandable, robust. — [W3C Understanding WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/intro.html) — MEDIUM-HIGH (the four principle names come from W3C text quoted in a search summary; the page was not fetched).
- ICD 203 (U.S. Intelligence Community analytic standards) lists nine Analytic Tradecraft Standards: (1) describes quality and credibility of underlying sources, data and methodologies; (2) expresses and explains uncertainties; (3) distinguishes underlying information from analysts' assumptions and judgments; (4) incorporates analysis of alternatives; (5) demonstrates customer relevance and addresses implications; (6) uses clear and logical argumentation; (7) explains change to or consistency of judgments; (8) makes accurate judgments and assessments; (9) incorporates effective visual information. It adds that assumptions serving as the linchpin of an argument should be stated explicitly. — [ICD 203, ODNI archive](https://archive.dni.gov/files/documents/ICD/ICD-203.pdf) — HIGH (PDF text extracted and read).
- Ousterhout defines complexity as anything that makes a system hard to understand and modify; its symptoms are change amplification, cognitive load and unknown unknowns; its causes are dependencies and obscurity; deep modules (simple interface, rich implementation) beat shallow ones; he recommends spending about 10-20% of time on design. — [Dan Lebrero's book notes](https://danlebrero.com/2021/02/24/philosophy-of-software-design-summary/); [Stanford page](https://web.stanford.edu/~ouster/cgi-bin/book.php) (confirms edition and a chapter titled "General-Purpose Modules are Deeper") — MEDIUM (notes and a page that does not list the red flags; book not read).
- Kernighan and Plauger: make it right before faster; measure before efficiency changes. — [rules listing](https://www.miketaylor.org.uk/tmp/eops-rules.html) — MEDIUM.
- Tufte: show the data first, maximize the data-ink ratio within reason, erase non-data-ink and redundant data-ink, revise and edit; graphical integrity means honest representation. — [Stasko notes](https://faculty.cc.gatech.edu/~stasko/7450/13/Notes/tufte.pdf) — MEDIUM (lecture notes).
- Zinsser: clutter is the disease of American writing; his concrete illustration is a pilot who "anticipates experiencing considerable precipitation" instead of saying it may rain; he also says "people read with their ears". — [Publication Coach](https://www.publicationcoach.com/?p=5874); [LitCharts](https://litcharts.com/lit/on-writing-well/chapter-2-simplicity) — MEDIUM (the "ears" line comes from the same quoting page; the pilot example from a summary).
- Strunk Rule 13 (quoted in Section 1) — [Gutenberg](https://www.gutenberg.org/files/37134/37134-h/37134-h.htm) — HIGH.
- Rumelt's "kernel" of a good strategy: diagnosis, guiding policy, coherent action; the main test is that it rules things out. — [Concepts summary](https://concepts.dsebastien.net/concept/kernel-of-good-strategy/); [Substack summary](https://evansamek.substack.com/p/good-strategy-bad-strategy-by-richard) — MEDIUM (blog summaries, not the book).
- Klein's pre-mortem and the Scrum Definition of Done as plan-level checks — [Klein](https://www.gary-klein.com/premortem); [Scrum Guide](https://scrumguides.org/scrum-guide.html), both as cited in [the earlier report](file:///Users/firegroup/projects/claude-plugins/reports/AI%20post%20task%20bar%20raising%20skill.md) — HIGH (per earlier report).
- Code health matters measurably: across 39 proprietary codebases (30,737 files), low-quality code had "15 times more defects", took "124% more development time" per issue, and had maximum cycle times "9 times longer" than high-quality code. — [Tornhill and Borg, arXiv 2203.04374](https://arxiv.org/abs/2203.04374) — HIGH (abstract read); the Code Health metric belongs to a vendor (CodeScene) — MEDIUM on independence.

### Dimension tables

**Code**
| Dimension | Anchor | Observable test (proposed) |
|---|---|---|
| Correctness | K&P "make it right"; Beck | Specified behaviors and the added edge cases run green; a deliberately broken variant makes a test fail. |
| Clarity | Ousterhout: obscurity, cognitive load | A fresh-context reader states each public function's contract from name, signature and doc alone; any mismatch with the code is a defect. |
| Economy | Rams #10; Strunk (no unnecessary parts) | Deletion trial: remove each helper, parameter, branch and comment; if tests and behavior are unchanged, it stays removed. |
| Cohesion and depth | Ousterhout: deep modules, change amplification | List 3 plausible near-term changes; count places each touches; target one each, or state why not. |
| Testability | Derived (no sourced test standard read) | Each behavior has a test that fails when the behavior is removed. |
| Performance, where measured | K&P: instrument and measure first | Any optimization carries a before/after benchmark; none without a measurement. |

**Prose and docs**
| Dimension | Anchor | Observable test (proposed) |
|---|---|---|
| Structure | Reverse outline (practice, no evidence found) | One sentence per paragraph written from the text alone; the sequence reads as the argument; a paragraph with two points or none is fixed. |
| Precision | Zinsser (concrete example) | Every claim has a checkable referent (number, name, example); vague quantifiers are flagged. |
| Economy | Strunk #13; King 10%; Zinsser | After cutting at least 10%, a fresh reader's answers to preset questions are unchanged. |
| Voice and rhythm | Zinsser ("read with their ears"); read-aloud study | Linear read (or aloud) flags every sentence needing a second read. |
| Evidence | ICD 203 #1 | Sample 10 factual claims; each traces to a source or executed output. |
| Audience fit | Derived | The reader's first question is answered in the first screen. |

**Plans**
| Dimension | Anchor | Observable test (proposed) |
|---|---|---|
| Diagnosis and goal fit | Rumelt kernel | One-sentence goal; every step traces to it; orphan steps removed. |
| Completeness | Scrum Definition of Done | Requirements-to-steps matrix with zero orphans; each step has a done test. |
| Sequencing | Derived | Order is dependency-valid; riskiest or most informative step is early. |
| Risk handling | Klein pre-mortem | Top 3 failure causes from a pre-mortem each have a mitigation or tripwire. |
| Assumptions explicit | ICD 203 #3 | Linchpin assumptions listed, each with a check and the consequence if false. |
| Trade-offs | Rumelt: good strategy rules things out | At least one rejected option, with the reason. |

**Analysis**
| Dimension | Anchor | Observable test (proposed) |
|---|---|---|
| Source quality and denominators | ICD 203 #1 | Every rate or percentage states n and its denominator; every source is rated. |
| Uncertainty | ICD 203 #2 | Each major judgment carries a confidence or likelihood, the reason, and what would change it. |
| Assumptions vs evidence | ICD 203 #3 | Assumptions are separated from observed facts in the text. |
| Alternative explanations | ICD 203 #4 | At least two rival explanations, each with the evidence that would discriminate. |
| Argument | ICD 203 #6 | Conclusion first; each inferential step traceable. |
| Accuracy and consistency | ICD 203 #7-#8 | Key numbers recomputed independently from raw data; changes from earlier conclusions stated. |

**UI and design**
| Dimension | Anchor | Observable test (proposed) |
|---|---|---|
| Hierarchy | Nielsen #8; Tufte | The three visually heaviest elements are the three most task-critical ones. |
| Consistency | Nielsen #4 | Same action maps to one pattern across screens; deviations from design tokens counted. |
| Accessibility | WCAG POUR | Automated contrast and role audit clean at AA; keyboard-only path completes the task; controls have accessible names. |
| Understandability and feedback | Rams #4; Nielsen #1, #9 | A first-time user (or fresh agent in a browser) completes the core task unaided; errors say what to do. |
| Thoroughness | Rams #8 | Every spacing, size and color value comes from a token or has a stated reason. |
| Delight and aesthetic | Rams #3, #6 | Not objectively testable; use side-by-side against exemplars and label as taste. |

### Inferences
- The dimension lists give the raising bar its levels: for each dimension, "what is the next observable that is not yet met?" Dimensions with a deterministic test (correctness, accessibility audit, denominators, deletion trial) can be gated by evidence; dimensions without one (voice, delight, audience fit) can only be compared against exemplars.
- The plan dimensions are the weakest-sourced: only Rumelt (secondary), Klein and Scrum (via the earlier report), and ICD 203 for assumptions. A plan rubric in the skill should be labeled as derived.
- Code Health's measurable returns (15x defects, 124% time) support the claim that code quality is worth chasing beyond "approved", with the vendor caveat above.

### Gaps
- No primary-text read of Ousterhout's red-flag list, Tufte, Zinsser, Kernighan and Pike, or Google's reviewer checklist this session.
- No established dimension set found for plans beyond Rumelt, pre-mortem and Definition of Done.
- WCAG was confirmed from a search summary of the W3C page, not a full read.
- Observable tests are my proposals; none has been validated against outcomes.

---

## 4. Evidence on over-polish at high quality

### Takeaway
There is solid evidence that a high standard helps and that open-ended self-criticism costs hours without improving performance. Direct quantification of "overworked" or "lifeless polish" does not exist in what I found. The best-quantified risk for an AI is a different one: the pull toward adding.

### Cited Findings
- Bellam and Curran 2025 (28 samples, 77 effect sizes, 9,560 participants): both perfectionistic strivings and perfectionistic concerns correlate positively with hours worked; only strivings correlate positively with performance; concerns do not. The abstract gives no correlation coefficients. — [LSE Research Online](https://researchonline.lse.ac.uk/id/eprint/128910/) — HIGH (abstract read). A popular write-up's interpretation that overthinking converts hours into no gain is commentary, not a finding ([Simply Psychology](https://www.simplypsychology.org/the-price-of-perfect-how-perfectionism-shapes-work.html)) — LOW.
- A 43-study meta-analysis (Hill and Curran 2016) found perfectionistic concerns related to burnout (medium to large) and strivings weakly or not. — [Bath research portal](https://researchportal.bath.ac.uk/en/publications/multidimensional-perfectionism-and-burnout-a-meta-analysis/) — MEDIUM (search summary).
- Revision studies are weak but consistent in direction: the amount of revision did not reliably track writing quality (EFL college writers, the most extensive revisers spanned the whole quality range); revision improved state-assessment essays only modestly and many final drafts were unchanged; assigning multiple drafts did not reliably produce global revision (NCTE 2010 study and a 112-student survey); a structured redraft written without access to the first draft produced better final drafts (UBC thesis). — [Hiroshima U.](https://ir.lib.hiroshima-u.ac.jp/25709/files/28098); [LSU dissertation](https://repository.lsu.edu/gradschool_disstheses/5239); [NCTE](https://publicationsncte.org/content/journals/10.58680/rte201010849); [UBC](https://circle.ubc.ca/handle/2429/26844) — MEDIUM-LOW (abstract-level, small and student samples, summaries only).
- Over-analysis can hurt judgment: students asked to analyze reasons chose jams and courses that matched expert opinion less well (Wilson and Schooler 1991, JPSP 60:181). — [AcaWiki](https://acawiki.org/Thinking_Too_Much:_Introspection_Can_Reduce_the_Quality_of_Preferences_and_Decisions) — MEDIUM. The tasks are preference choices, not artifact refinement.
- In code the high end does not look wasteful: a model of two public datasets found "strong non-linearities at the extremes" and "amplified returns on investment in the upper end" of code quality. — [Increasing, not Diminishing, arXiv 2401.13407](https://arxiv.org/abs/2401.13407) — HIGH (abstract read; no numbers on the page). Combine with Code Red (15x defects, 124% time) above; both have vendor-adjacent data.
- The additive-bias numbers from Section 1 (59% Lego adds in humans; 76.38% and 97.85% in LLM tasks; summaries lengthening in 59.40-75.10% of cases) are the clearest quantification of a polish failure for an AI.
- Hemingway rewrote one ending 39 times and left 47 alternative endings; this is a case of intense iteration at the top end, not a measure of whether it was over-polish. — [Morgan Library](https://www.themorgan.org/blog/getting-question-right); [CBC](https://amp.cbc.ca/lite/story/1.1273101) — MEDIUM-HIGH.
- Goodhart's warning applies to any bar: when a measure becomes a target it ceases to be a good measure (Strathern 1997), as cited in the earlier report. — [Strathern](https://www.Gwern.net/doc/statistics/decision/1997-strathern.pdf) — MEDIUM.
- Explicit written bars help (rubrics meta-analysis g=0.45 on performance) — [Panadero et al. 2023 abstract](https://deustoteka.deusto.es/items/59022074-df96-4c6a-8c52-3aa513c0ae3e/full), as cited in the earlier report — HIGH (abstract; CI quirk noted there).

### Inferences
- "Perfect" is safe only as a high-standard-plus-hard-stop construct. The striving/concern split (HIGH) says a high bar is not the problem; unbounded self-criticism is. This reconciles the user's "perfect" with the repo's "better, not perfect": define perfect against a written, finite bar and stop on a rule.
- The AI-specific over-polish mode is not paralysis but growth: more words, more abstractions, more defensive code. Countermeasures: deletion test, length and size budgets for the artifact, and a check that the change set shrinks or stays flat unless an addition is justified by a failing dimension. Transfer of the bias studies to real editing is unmeasured (MEDIUM).
- Lost spontaneity and "uncanny polish" are plausible for voice, UI and creative work, but I found no study. Treat as an unquantified risk and keep the voice dimension tied to exemplars.
- Because the readers in the reading-aloud study could not feel the benefit, an agent's own sense that a pass "improved things" should not count; only checks that change an observable should.

### Gaps
- No peer-reviewed measurement of "overworked" art or "lifeless polish" found.
- No experiment plotting quality against number of revision passes found.
- Effect sizes (r values) for Bellam and Curran not in the abstract; full paper not opened.
- The high-end code-quality results are from vendor-adjacent data.

---

## 5. Synthesis: the eight practices most worth encoding, and a proposed operational definition of "perfect"

### Takeaway
Encode a subtraction-first, evidence-gated, exemplar-referenced loop with a non-regression ledger and a hard stop that releases with named leftovers. "Perfect" can be defined operationally as "no remaining improvement survives independent verification against an exemplar-derived bar, within a pass cap", which is honest about being relative.

### Cited Findings
Ranking basis is the evidence cited in Sections 1-4 (rank = evidence strength weighted by single-agent transfer; the weighting is the researcher's judgment).

| Rank | Practice | Justification (sources) | Evidence strength | Transfer to one AI agent | Fresh context or second model |
|---|---|---|---|---|---|
| 1 | Subtraction-first pass with a deletion test (Strunk, Rams #10, Saint-Exupéry, King 10%) | Humans and LLMs default to adding; "improve" increases adding in GPT-4 ([Uhler](https://arxiv.org/abs/2404.16692), [Santagata](https://arxiv.org/abs/2409.02569), [Adams](https://sites.olemiss.edu/scilab/publications/people-systematically-overlook-subtractive-changes)). | HIGH that the bias exists; MEDIUM-LOW that cutting improves real artifacts (no controlled test) | HIGH | Not required; a fresh reader helps verify nothing meaning-bearing was cut |
| 2 | Executed ground truth plus level order: correctness, then structure, then economy, then polish; measure before optimizing | K&P and Beck ordering; Code Red links code health to defects and time ([arXiv 2203.04374](https://arxiv.org/abs/2203.04374)). | MEDIUM | HIGH for code; MEDIUM for other artifacts (recompute numbers, run examples) | No |
| 3 | Exemplar-derived, decomposed bar: study 2-3 best-in-class exemplars first, derive dimensions with observable tests | Rubric meta-analysis g=0.45 ([Panadero](https://deustoteka.deusto.es/items/59022074-df96-4c6a-8c52-3aa513c0ae3e/full)); comparison of two cases about 3x transfer ([Kellogg](https://www.kellogg.northwestern.edu/academics-research/research/detail/1999/analogical-encoding-facilitates-knowledge-transfer-in-negotiation/)); marginal gains used only as decomposition. | MEDIUM | HIGH | No; but exemplar choice should come from outside the draft (retrieved, user-named or known canons) |
| 4 | Blind side-by-side against the exemplars at matched conditions (reference-track A/B) | Mastering practice: level-match or be fooled ([PureMix](https://www.puremix.com/blog/how-to-use-reference-tracks-when-mixing)); same comparison evidence as above. | LOW-MEDIUM (vendor sources; learning-transfer evidence, not artifact quality) | MEDIUM-HIGH | A fresh-context judge, ideally a different model, to reduce authorship bias |
| 5 | Fresh-context cold read with reader-persona questions, plus consuming the artifact in its delivered medium | Read-aloud benefit ([Learning Scientists](https://learningscientists.org/blog/2022/10/20-1)); incubation meta-analysis ([Sio and Ormerod](https://pubmed.ncbi.nlm.nih.gov/19210055/)); no time-gap proofreading study found. | LOW-MEDIUM | MEDIUM | Yes, a fresh context; second model optional |
| 6 | Non-regression ledger (plussing): each change states what strength it preserves; re-verify preserved invariants after every change | Plussing practice ([LeadX](https://leadx.org/articles/pixar/)); Braintrust "no authority" rule ([First Round](https://review.firstround.com/Spark-Creativity-with-These-Tips-from-Pixars-President)); ratchet idea from the earlier report. | LOW (no outcome data) | MEDIUM-HIGH | No |
| 7 | Hard stop with named leftovers: cap on passes, stop when two consecutive passes yield no verified improvement, release with a leftover list (Valéry "abandoned") | Concerns add hours without gain ([Bellam and Curran](https://researchonline.lse.ac.uk/id/eprint/128910/)); [Valéry attribution](https://quoteinvestigator.com/2019/03/01/abandon/); Google's "no perfect code" standard. | MEDIUM for the problem; LOW for any specific threshold | HIGH | No |
| 8 | Kaizen/kaikaku gate: when the best remaining improvement is a rewrite or re-architecture, surface it with options instead of doing it | Definitions of kaizen and kaikaku ([Wikipedia](https://www.Wikipedia.org/wiki/Kaikaku)); consistent with the "propose before executing" rule in the user's instructions. | LOW (definitional) | HIGH | No |

Folded in rather than ranked: deliberate practice contributes the loop structure (goal, immediate feedback, repeated revised attempts) rather than a separate practice ([Ericsson and Harwell](https://www.frontiersin.org/articles/10.3389/fpsyg.2019.02396/full)); the pre-mortem and fresh adversarial reviewer are covered by the earlier report.

### Inferences
**Proposed operational definition.** A work is *perfect relative to bar B* when all of these hold:
1. Every executable check for its type passes (tests, types, accessibility audit, recomputed numbers, examples run).
2. A deletion pass finds no element whose removal leaves the goal-relevant observables unchanged.
3. Against N≥2 exemplars chosen before the pass, a blind pairwise comparison by a fresh-context reviewer rates the work at or above the exemplar on every dimension that has a test.
4. A fresh-context reviewer, asked to name specific improvements with a predicted observable effect, produces none that an independent check confirms.
5. The run stayed inside its pass and tool-call cap; leftovers (unverifiable taste items, deferred rewrites) are listed.

**Weaknesses, stated plainly:**
- It is relative. The exemplars cap the ceiling, and if the agent picks weak or biased exemplars "perfect" will be mediocre. Exemplar selection should be anchored outside the draft.
- (3) and (4) rely on LLM judgment; a same-model reviewer shares blind spots, and "found no improvement" is not "none exists". Judge reliability is covered by another researcher's facet and is not assessed here.
- It is Goodhart-prone: dimension tests can be gamed (shorter text that loses nuance, tests that pass trivially). The bar must stay tied to the user's goal and be re-anchored on each pass.
- Taste dimensions (voice, delight, audience fit) are not evidence-verifiable; the definition only handles them by exemplar comparison.
- It costs more than the usual review loop; the cap exists for this reason.
- The cited human evidence concerns striving versus concern, comparison, and subtraction bias. No study tested this combined procedure on an AI agent.

**Positioning against `aio-code-review/SKILL.md:54`.** The repo standard ("There is no 'perfect' code, only *better* code") governs approval of a change: merge once it definitely improves code health. A good-to-perfect pass runs afterward and on request, on work that is already approved or already good, and asks a different question: does any improvement remain that survives verification? The two do not conflict if the new skill states its definition as relative and finite and keeps "Nit"-style severity labels. The wording of the new skill's description should avoid promising absolute perfection; the trigger words ("perfectize", "make it perfect", "polish to the highest standard") can still sit in the description per `CLAUDE.md:31`, and any plugin change needs a version bump per `CLAUDE.md:39`.

**Design implications for the skill (derived):**
- Open the pass with the deletion test and a size budget, because the default drift is additive.
- Set the bar from exemplars and fixed observables before looking for faults.
- Run passes in level order and re-verify preserved invariants after each change.
- Use a fresh-context reader for the cold-read and A/B steps; keep the author context out of it.
- End with a "released at B, leftovers: …" statement rather than a claim of completeness.

### Gaps
- No evidence on this combined procedure with an AI agent; the ranking weights are judgment.
- No sourced threshold for pass count or yield (the "two consecutive empty passes" rule is a design choice).
- Exemplar selection for each artifact type is unresolved: where an agent finds trustworthy exemplars without the web or user input needs a design decision.
- Items needing primary-text verification before publication: Saint-Exupéry's page citation, Beck's attribution, Pixar quotes, Tufte and Zinsser wording, Ousterhout's red-flag list.
