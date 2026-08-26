# Research foundations

Human-facing provenance, loaded by no skill and read during no composition. Open it when changing the plugin, defending a claim it makes, or tracing where a number came from. One line per source: who, where, and the one thing it licenses the plugin to assert. The numbers, quotations, and findings live at the URL and beside the rules in the execution references; the failures live in "Explicitly dropped, and why". **[self-reported]** marks a self-measured claim with no external citation; **[caveat]** names the retrieval gap. Spot-checks ran 2026-08-13; URLs omit `https://`.

**Why a provenance file for 160 sources is 46 KB, and what a reader does with it.** Measured 2026-08-13, this paragraph included: 45,948 B over 312 lines — 29,108 B of citation sections at 182 B a source, 15,207 B (33%) of negative space in the last four sections, 1,633 B of this header. The negative space is the expensive part and it is the part that earns the size: `Explicitly dropped, and why` and `What the evidence does not support` record what those 160 sources refused to license, and a citation read without them turns a caveat into a licence. No skill loads this file and no composition reads it — one inbound link, from `README.md` — so these bytes cost a running artifact nothing and cost a maintainer one grep. Read it by searching for the number, the author, or the claim string; each lands on the one line that owns it. It stays one file because a source and the thing that source stops the plugin asserting answer the same question, and the reader holding one of them needs the other in the same buffer.

## Graphical perception and encoding

- Cleveland & McGill 1984 — math.pku.edu.cn/teachers/xirb/Courses/biostatistics/Biostatistics2016/GraphicalPerception_Jasa1984.pdf — the ten-task accuracy hierarchy. **[caveat]** position-angle and position-length were separate experiments, so "angle beats length" stays unlicensed.
- Munzner 2014 — cs.ubc.ca/~tmm/talks/minicourse14/minicourse14-session1.pdf (+session4) — channel ranking, effectiveness principle.
- Heer & Bostock 2010 — vis.stanford.edu/files/2010-MTurk-CHI.pdf — chart size and gridline floors.
- Amar, Eagan & Stasko 2005 — faculty.cc.gatech.edu/~stasko/papers/infovis05.pdf — the ten analytic tasks.
- uwdata/draco, BSD-3-Clause — github.com/uwdata/draco — machine-checkable encoding ceilings.
- Axis Maps after Bertin 1967 — axismaps.com/guide/visual-variables — the channel legality table. **[caveat]** secondary; Bertin unread.
- Tufte 2006 — edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/ — the word-sized graphic.
- Tufte, PowerPoint — fceia.unr.edu.ar/~mcristia/tufte-powerpoint.pdf — the deck density floor.
- Few — perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf — the thirteen dashboard pitfalls.
- Keith-Norambuena 2026 — arXiv:2602.01527 — machine-readable source values, because VLMs tokenize patches.

## Argument architecture, narrative structure, and sequencing

- Minto per Sieber 2017 — adrian.idv.hk/2017-12-20-minto/ — SCQA and the group orderings.
- Millerd 2017 — strategyu.co/pyramid-principle-partone/ — the construction rules. **[caveat]** Minto's book was never retrieved, so every mechanic is "as summarised by".
- AR 25-50, 2020 (rev. 2024) — armypubs.army.mil/epubs/DR_pubs/DR_a/ARN42124-AR_25-50-007-WEB-13.pdf — BLUF as doctrine, with its sentence, paragraph, and banned-opener rules.
- Sehgal, HBR 2016 — hbr.org/2016/11/how-to-write-email-with-military-precision — the six keywords, actor-action-deadline.
- Nygard 2011 — cognitect.com/blog/2011/11/15/documenting-architecture-decisions — the five ADR sections.
- MADR 4.0.0 — adr.github.io/madr/ · raw.githubusercontent.com/adr/madr/develop/template/adr-template.md — section order and sentence stems.
- Rust RFC template — raw.githubusercontent.com/rust-lang/rfcs/master/0000-template.md — Drawbacks, Prior art, Unresolved questions.
- RFC 7322, 2014 — rfc-editor.org/rfc/rfc7322.txt — a self-contained, uncited abstract.
- Ubl — industrialempathy.com/posts/design-docs-at-google/ — Non-Goals as mandatory; the length bands.
- Amazon 2017 letter — aboutamazon.com/news/company-news/2017-letter-to-shareholders — prose over slides.
- Text-structure review, ERIC EJ1070453 — files.eric.ed.gov/fulltext/EJ1070453.pdf — top-level structure choice, signal words, five effect sizes. **[caveat]** the pooled effect size was publisher-elided.
- Segel & Heer 2010 — homes.cs.washington.edu/~jheer/files/narrative.pdf — the seven genres (magazine style, annotated chart, partitioned poster, flow chart, comic strip, slide show, film/video/animation). §4.1 gives the `ordering=` enum verbatim: "this path is prescribed by the author (linear), sometimes there is no path suggested at all (random access), and other times the user must select a path among multiple alternatives (user-directed)". §4.4 orders the three hybrids "The first structure prioritizes the author-driven approach, the second structure promotes a dialogue between the two approaches, while the third structure prioritizes the reader-driven approach" — §4.4.1 martini glass, §4.4.2 interactive slideshow ("incorporates interaction mid-narrative within the confines of each slide"), §4.4.3 drill-down ("puts more emphasis on the reader-driven approach, letting the user dictate what stories are told and when"). Full text re-read 2026-08-13; every quotation above checked character-for-character.
- Hullman et al. 2013 — mucollective.northwestern.edu/files/2013-StorySequence-InfoVis.pdf — Jessica Hullman, Steven Drucker, Nathalie Henry Riche, Bongshin Lee, Danyel Fisher, Eytan Adar. Table 1 codes **twelve** transition types in six categories over 42 visualizations: Temporal 88.1% (simple chronological 29/42, reverse 11, future 12) · Granularity 71.4% (general→specific 28, specific→general 16) · Comparison 64.3% (dimension walk 20, measure walk 19) · Causal 23.8% (explicit cause 7, alternative reality 3) · Spatial 23.8% (spatial proximity 10) · Dialogue 16.7% (question & answer 4, who/what/when/where/why/how 3). Transformation cost, §5.1.3: 143 participants over 875 trials, 179 (20.4%) omitted for a wrong information-extraction answer, 696 retained; participants were "much less likely to choose a higher cost transition relative to a transition with a cost of '1'" with "no observable difference" between cost 2 and cost 3. Type preference at constant cost: `Temporal > (Dimension | Measure) > Granularity`, all p<0.01, no preference between dimension and measure. Parallelism, §5.2.3: 82 completed, 73 after the verification question; sequence-memory ANOVA F(3,69)=5.59, p=0.002, reverse treatments worst, while comparison accuracy showed no treatment difference (df=69, t=1.58, p=0.12; df=70, t=-0.57, p=0.57). **[caveat]** slideshow sequences, memory benefit only; report skeletons extrapolate. Full text re-read 2026-08-13.
- Hullman & Diakopoulos 2011 — users.eecs.northwestern.edu/~jhullman/vis_rhetoric.pdf — *Visualization Rhetoric: Framing Effects in Narrative Visualization*, IEEE TVCG 17(12). The four editorial layers, verbatim: "the data, visual representation, textual annotations, and interactivity". Fetched and confirmed 2026-08-13.
- Munzner 2009 — cs.ubc.ca/labs/imager/tr/2009/NestedModel/NestedModel.pdf — the four-level pre-flight header.
- Kosara & Mackinlay 2013 — eagereyes.org/publications/Kosara-Computer-2013 — *Storytelling: The Next Step for Visualization*, IEEE Computer 46(5), 44-50. Verdict-first for non-deciding analysts, the case being that "an analyst is not the same person as the one who makes decisions, or simply needs to share information with peers". Page fetched and confirmed 2026-08-13.

## Data story: annotation, sequencing, and number framing

Loaded by `data-story.md`, which carries the rules and cites these by name. Verified 2026-08-13.

- Rahman, Lange, Quadri & Rosen 2026 — arXiv:2604.07691 — *Designing Annotations in Visualization: Considerations from Visualization Practitioners and Educators*, ten practitioners and seven educators. Licenses the functional definition of annotation ("textual or graphical elements that form an author-supplied communicative layer over the underlying encodings"), the Hierarchy rule ("make the primary annotation dominant and secondary notes visually subordinate"), the Placement rule ("place text next to its target when possible, use short connectors when proximity is infeasible, and use a key or legend only when direct attachment would clutter the view"), the density figure as P1's habit ("on average, three, maximum five, if I'm pushed") inside a passage naming such numbers "local guidance rather than universal limits", the reuse risk ("charts can circulate stripped of provenance"), the ethics framing ("emphasis can bias interpretation even when encodings are correct"), and E3's cost objection to "defensive labels all over the place". It is also where the Amanda Cox line reaches this plugin — that paper quotes it and cites Kirk 2012, so the plugin labels it **[CONVENTION]**, widely attributed, no primary transcript located. **[correction]** an earlier draft named the second author *Doppalapudi*; the author list is Md Dilshadur Rahman, **Devin Lange**, Ghulam Jilani Quadri, Paul Rosen. All eight quotations above were grepped against the arXiv HTML full text.
- Stokes, Setlur, Cogley, Satyanarayan & Hearst — annotation count and the four semantic levels' placement, n=302 after exclusions from 512 recruited. **[caveat]** the guidelines are scoped to univariate line charts; `data-story.md` prints that scope.
- Kong, Liu & Karahalios 2019 — see *Headings, titles, and captions*. The two sentences `data-story.md` quotes are the published abstract's own, recovered through the Semantic Scholar graph API after the DOI landing page 403'd; the body, and therefore every magnitude, stays unverified.
- Gigerenzer, Gaissmaier, Kurz-Milcke, Schwartz & Woloshin — the sentence pattern ("Drug X lowered the risk of heart attack by 10 in 100: from 20 in 100 to 10 in 100 over 10 years"), the one-way derivation, mismatched framing, and the secondary reports it carries: Sarfati et al. 1998 (n=306; 80% vs 53% and 43%), Sedrakyan & Shih 2007 (1 in 3 studies), Welch, Schwartz & Woloshin 2000 (5-year survival uncorrelated with mortality, r = 0.0). **[caveat]** those three are read through Gigerenzer et al. rather than fetched.
- CONSORT 2010 item 17b — "For binary outcomes, presentation of both absolute and relative effect sizes is recommended." **[DOCTRINE]**
- UK Government Analysis Function — the bar-chart zero baseline, the four broken-axis elements, and the draw-the-target rule. **[DOCTRINE]**
- Correll, Bertini & Franconeri — arXiv:1907.02035 — truncation moves perceived severity and marking it does not undo the move; also the refusal of a blanket always-include-zero rule. Distinct from Correll 2019 (arXiv:1811.07271) in *Evidence, provenance, and calibrated language*.
- Menge et al. — doi:10.1038/s41559-018-0610-7 — 93% linear against 56% log, 623 completed surveys. **Romano, Sotis, Dominioni & Guidi**, Health Economics 2020 — N=2,074, the linear group chose 17.4 more days. **[caveat]** their 83.79%/40.66% comprehension split comes from the authors' LSE blog write-up rather than the paper, so `data-story.md` carries neither number.
- FT Visual Vocabulary — the deviation-chart definition. **Datawrapper** — axis-label placement and annotation alignment. **W3C SVG Accessibility Task Force** — under `role="img"` "any child DOM structure is ignored except for plain text", which is why the annotation ledger exists as a table.

## Sentence and paragraph craft

- Gopen & Swan 1990 — gatsby.ucl.ac.uk/~pel/misc/gopen_swan.pdf — topic and stress position.
- Gopen 2022 — georgegopen.com/wp-content/uploads/2026/04/amer-sci-2022-1-article.pdf — the 25-word trigger, the `//` diagnostic. **[caveat]** numbers read from rendered page images; quoted wording is medium confidence.
- Ferreira 2021, doi:10.1037/amp0000620 — psycnet.apa.org/manuscript/2020-19385-001.pdf — passive-detection heuristics are neither necessary nor sufficient. Author-accepted manuscript; cite the DOI with it.
- Federal Plain Language Guidelines — learninglink.oup.com/protected/files/content/file/1604482170391-Ch-02-Federal-Plain-Language-Guidelines.pdf — hidden verbs, the passive carve-out.
- UNC Writing Center — writingcenter.unc.edu/tips-and-tools/passive-voice/ — a third confirmation of the passive conditions.
- **[caveat]** carried wherever these are cited: Gopen & Swan's endnote traces the methodology to Williams, Colomb and Gopen, so Williams and Gopen & Swan are one tradition rather than two converging sources. The independent corroboration is Ferreira plus the federal guidelines.

## Headings, titles, and captions

- Alley et al. — writing.engr.psu.edu/ae_headlines.pdf — the assertion-headline gain, two null controls.
- Garner & Alley 2013 — writing.engr.psu.edu/ae_comprehension.pdf — immediate and delayed effect sizes.
- Alley & Neeley — writing.engr.psu.edu/ae_rethinking.pdf — headline top-left, two-line cap, type-size ratio.
- Kim et al. — dhkim16.github.io/chart-caption-takeaway/pdf/paper.pdf — basic captions read as no caption.
- Kim et al. — dhkim16.github.io/emphasis-checker/pdf/paper.pdf — the Tableau Public basic-caption share.
- Lundgard & Satyanarayan 2021 — arXiv:2110.04406 — the four-level description model, the ranking split.
- Caltech Hixon 2024 — writing.caltech.edu/documents/27629/HWC-FigureCaptionHandout.1-2024.pdf — caption anatomy past the axis labels.
- Urban Institute — urbaninstitute.github.io/graphics-styleguide/ — the title/subtitle/note/source stack.
- NN/g — nngroup.com/articles/headings-pickup-lines/ · /first-2-words-a-signal-for-scanning/ — heading rules, first two words.
- Kong, Liu & Karahalios 2019 — doi.org/10.1145/3290605.3300576 — the direction only: recall aligns with titles. **[caveat]** closed-access; every magnitude is unverified and labelled at each use.

## Cognitive load, reading, and attention

- Shneiderman 1996 — cs.umd.edu/users/ben/papers/Shneiderman1996eyes.pdf — all seven tasks. The 5s/30s/3min budgets appear in no source and are deleted.
- van Ham & Perer 2009 — perer.org/papers/adamPerer-DOIGraphs-InfoVis2009.pdf — the exception to overview-first.
- Mayer & Moreno 2003 — uky.edu/~gmswan3/544/9_ways_to_reduce_CL.pdf — first-party. Coherence, redundancy, segmentation.
- Kalyuga, Ayres, Chandler & Sweller 2003 — mrbartonmaths.com/resourcesnew/8.%20Research/Explicit%20Instruction/The%20Expertise%20Reversal%20Effect.pdf — first-party. The reverse-traversable ladder.
- Rey et al. 2019 — maria-wirzberger.de/wp-content/uploads/2019/01/Rey2019_Article_AMeta-analysisOfTheSegmentingE.pdf — first-party. Author-defined scene boundaries.
- Chernev, Böckenholt & Goodman 2015 — chernev.com/wp-content/uploads/2017/02/ChoiceOverload_JCP_2015.pdf — first-party. Four moderators replace an option cap.
- Cowan 2010 — pmc.ncbi.nlm.nih.gov/articles/PMC2864034/ — a store limited to 3-5 items.
- Ginns 2006 (10.1016/j.learninstruc.2006.10.001) · Schroeder & Cenkci 2018 (10.1007/s10648-018-9435-9) · Sundararajan & Adesope 2020 (10.1007/s10648-020-09522-4) · Schneider et al. 2018 (10.1016/j.edurev.2017.11.001) — proof beside claim, decorative content as harmful, signalling as the one enhancement with no expertise reversal. **[caveat]** effect sizes come from abstracts, not full text — MEDIUM, labelled at every use.
- Beege et al. 2019 — frontiersin.org/journals/education/articles/10.3389/feduc.2019.00086/full — the two-sided proximity rule. **[self-reported]** the CSS-pixel conversion is our arithmetic at an assumed 60cm distance.
- Pernice 2017 — nngroup.com/articles/f-shaped-pattern-reading-web-content/ — layer-cake scanning, the heading-only truth test.
- Nielsen 2006 — nngroup.com/articles/progressive-disclosure/ — `<details>`, split by frequency of need.
- Harley 2020 — nngroup.com/articles/gestalt-proximity/ — whitespace before borders; false floors.
- Norman 2008 — jnd.org/signifiers-not-affordances/ — the terminology Norman retired.
- Kienitz, Krebs & Eitel 2023 — pmc.ncbi.nlm.nih.gov/articles/PMC10176302/ — decorative interaction is negative, not neutral.

## Interaction: the case against

- Victor, worrydream.com — `/MagicInk/` 2006: interaction as the negative aspect of information software. `/ExplorableExplanations/` 2011: a reactive document exposes the model. `/LadderOfAbstraction/` 2011: draw every state at once. `/LearnableProgramming/` 2012: a control renders its value as text. `/MediaForThinkingTheUnthinkable/` 2013: one action updates two representations.
- Tse, Malofiej 2016 — github.com/archietse/malofiej-2016/blob/master/tse-malofiej-2016-slides.pdf — "Readers just want to scroll".
- Conlen, Kale & Heer 2019 — idl.cs.washington.edu/files/2019-IdyllAnalytics-EuroVis.pdf — the strongest evidence against widgets: median interactions of zero across 50,000+ sessions.
- Ancker, Benda & Zikmund-Fisher 2024 — pmc.ncbi.nlm.nih.gov/articles/PMC11491620/ — 181 studies, interactivity not yet shown to beat static. Scope: health-probability communication.
- Taka, Stein & Williamson 2022 — arXiv:2201.03605 — interaction raises confidence, not understanding.
- Hohman, Conlen, Heer & Chau 2020 — distill.pub/2020/communicating-with-interactive-articles/ — interactivity justified when core to the message.
- Distill policy — distill.pub/journal/ — from the field's most interaction-friendly publication: "often, but not always".
- Olah & Carter 2017 — distill.pub/2017/research-debt/ — audience size as an input to the interaction tier.
- Case, blog.ncase.me — `/explorable-explanations/` 2016: the four-way medium routing table. `/explorable-explanations-4-more-design-patterns/` 2017: the sandbox failure mode. **ncase/polygons, CC0-1.0** — github.com/ncase/polygons — constrained manipulation first.
- Matuschak — notes.andymatuschak.org/z179DabP631i5Mjf2DBMwoS — the actual wording: "a tax to be avoided".
- Wattenberger 2024 — wattenberger.com/thoughts/our-interfaces-have-lost-their-senses — stripping friction strips meaning.

## Typography and visual craft

- Butterick, *Practical Typography* — practicaltypography.com/`<slug>`.html — `typography-in-ten-minutes` (point size, line spacing, measure, rule 5 "don't use system/free fonts") · `summary-of-key-rules` · `bold-or-italic` · `letterspacing` · `all-caps` · `headings` · `system-fonts`. **[self-reported]** the unitless-`line-height` framing is our gloss.
- Rutter, webtypography.net 2.1.2 / 2.2.1 / 3.1.1 — the character-count measure. **clagnut.com/blog/2432** — `ch` is the advance of `0`, so use `em`.
- Design Regression — designregression.com/article/line-length-revisited-following-the-research — 45-75 as preference, not speed.
- Santa Maria 2014 — alistapart.com/article/how-we-read/ — all-caps collapsing word shapes into "plain rectangles".
- Bell 2018 — 24ways.org/2018/managing-flow-and-rhythm-with-css-custom-properties/ — the multiple-based spacing system.
- Liew — zellwk.com/blog/wrong-about-vertical-rhythm/ — asymmetric spacing around headings.
- Bell / Set Studio — buildexcellentwebsit.es/ — CUBE CSS, fluid type and space, the size budget.
- Brown 2011 — alistapart.com/article/more-meaningful-typography/ — the modular scale.
- Copeland — brutalist-web.design/ — the seven rules verbatim. **[self-reported]** the CSS recipe is our synthesis.
- Anthropic, frontend aesthetics — platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics — first-party. Fonts to avoid, purple-on-white as the cliché, weight and size jumps.
- Trystan-SA/claude-design-system-prompt, MIT — github.com/Trystan-SA/claude-design-system-prompt/blob/main/claude/skills/ai-slop-check.md — the literal slop tells with line numbers. `hierarchy-rhythm-review.md` licenses the colour cap; `frontend-aesthetic-direction.md` the six-axis commitment.
- maxsoweski/claude-design-skills, MIT — github.com/maxsoweski/claude-design-skills — the Müller-Brockmann build.
- Comeau 2021 — joshwcomeau.com/css/designing-shadows/ — one environment page-wide, hue-matched.
- Wathan & Schoger — gist.github.com/selcukcihan/b9418596a98abfcd4bbc622550820cc5 — scale steps far apart, fewer borders. **[caveat]** paraphrase, not the original.
- Tailwind docs — tailwindcss.com/docs/colors — why blue-purple is the default; the tokens to blocklist.
- Every Layout — every-layout.dev/layouts/switcher/ — Stack, Sidebar, Switcher. **AVivero/every-layout-skill, MIT** — github.com/AVivero/every-layout-skill/blob/main/every-layout.css — the twelve primitives.
- Rupert 2018 — daverupert.com/2018/04/pitfalls-of-card-uis/ — the card-grid ladder; cards as previews.
- susam/spcss, MIT — github.com/susam/spcss — the doubled-monospace fix.
- system-fonts/modern-font-stacks, CC0-1.0 — github.com/system-fonts/modern-font-stacks — the per-OS stacks verbatim. **[self-reported]** Charter on minimal Linux and Cambria without Office are unverified.
- edwardtufte/tufte-css, MIT — github.com/edwardtufte/tufte-css — the sidenote pattern. **[self-reported]** the rem-token rebuild and its measurements are our own harness.

## Accessibility, print, and platform

- W3C WAI, WCAG 2.2 Understanding — w3.org/WAI/WCAG22/Understanding/`<slug>`.html — `contrast-minimum` 1.4.3 (luminance and ratio formulas, both ratios, large-text sizes) · `target-size-minimum` 2.5.8 · `reflow` 1.4.10 · `focus-not-obscured-minimum` 2.4.11 · `focus-appearance` 2.4.13 · `focus-visible` 2.4.7 · `on-focus` 3.2.1 · `name-role-value` 4.1.2 · `link-purpose-in-context` 2.4.4 · `link-purpose-link-only` 2.4.9 with F84 · `headings-and-labels` 2.4.6 · `reading-level` 3.1.5.
- W3C, WCAG 2.2 — w3.org/TR/WCAG22/ — the 0.04045 luminance threshold, changed from 0.03928 before May 2021.
- W3C, Using ARIA — w3.org/TR/using-aria/ — the First Rule. **ARIA in HTML** — w3.org/TR/html-aria/ — the implicit-role table, `<section>` → `region` only when named. **APG Read Me First** — w3.org/WAI/ARIA/apg/practices/read-me-first/ — a role promises the full APG keyboard map in the same file.
- W3C WAI H86 — w3.org/WAI/WCAG21/Techniques/html/H86.html — `<pre role="img" aria-label>` as a fallback. **ACT Rule 0ssw9k** — act-rules.github.io/rules/0ssw9k/ — the focusable, named overflow container.
- Deque — deque.com/blog/creating-accessible-svgs/ — the two legal SVG shapes.
- dequelabs/axe-core, MPL-2.0 — github.com/dequelabs/axe-core/blob/develop/lib/checks/navigation/heading-order-after.js — the heading-order predicate, target-size constants, alpha flattening, rule-id vocabulary. Its README licenses the exclusion: color-contrast fails under JSDOM. **rocketvalidator.com/accessibility-validation/axe/4.9/heading-order** — Moderate impact, so it warns.
- MDN — developer.mozilla.org/en-US/docs/ — `Web/CSS/content` (generated content is absent from the DOM, a11y tree, and clipboard, so a confidence band is real text) · `@media/forced-colors` · `Web/HTML/Reference/Elements/details` (the `/Element/` path is stale) · `@page/size` · `Container_queries` · `light-dark()` · `anchor-name` (Baseline Newly, so inside `@supports`) · `textLength` · `font-variant-numeric` · `CORS/Errors/CORSRequestNotHttp` (`fetch()` from `file://` fails on opaque origins).
- **[self-reported]**, attached to those MDN entries: the `<details>` print page-count measurement, the exact-4-page `/MediaBox [0 0 960 540]` result, and the whole `file://` capability matrix past the CORS line — headless probes, uncorroborated.
- web.dev/articles/prefers-reduced-motion — the global reset block verbatim; `reduce` as "removes, reduces, or replaces".
- Mozilla Bugzilla 1676780 — bugzilla.mozilla.org/show_bug.cgi?id=1676780 — no scroll-driven animations in Firefox, hence the double guard.
- Piccalilli — piccalil.li/blog/printing-the-web-making-webpages-look-good-on-paper/ — `break-inside: avoid`, orphans and widows, `attr(href)`, `print-color-adjust: exact`.
- Microsoft OpenType OS/2 — learn.microsoft.com/en-us/typography/opentype/spec/os2 — the honesty clause: these metrics are not for line layout, so text overflow is not statically computable.
- Node.js `vm` — nodejs.org/api/vm.html — compiling without running. **[self-reported]** the top-level-`return` comparison is our own probe.
- Cloudflare — blog.cloudflare.com/html-parsing-1/ — the tokenizer-vs-tree-builder distinction. **[self-reported]** the malformed-markup depth experiment and our byte-equivalence check.
- WHATWG HTML §13.1.2 — html.spec.whatwg.org/multipage/syntax.html#elements-2 — the void and raw-text element sets. **Nu Html Checker** — validator.github.io/validator/ — the optional offline escalation.

## Microcopy, link text, and localisation

- W3C WAI images tutorial — w3.org/WAI/tutorials/images/decision-tree/ — redundant to nearby text → `alt=""`; complex information → elsewhere. `/images/complex/` licenses the two-part alternative; `/tables/caption-summary/` caption-as-heading.
- WebAIM — webaim.org/techniques/alttext/ — the ban on "image of"; the adjacent data link.
- Cesal — data.europa.eu/apps/data-visualisation-guide/alt-text — the formula as an attributed quote. **Nightingale** — medium.com/nightingale/writing-alt-text-for-data-visualization-2a218ef43f81 — the four components, the retracted cutoff. **[caveat]** 403 to curl, verified in-browser; the halves stay attributed separately.
- GOV.UK — design-system.service.gov.uk/components/error-message/ · /button/ · gov.uk/service-manual/design/writing-for-user-interfaces · guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/ — banned error words, button labels, sentence case, "select" over "click", and the six studies it cites.
- NN/g — nngroup.com/articles/`<slug>`/ — `writing-links` · `learn-more-links` · `concise-scannable-and-objective-how-to-write-for-the-web` · `how-little-do-users-read`.
- Microsoft Vietnamese style guide — download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf — sentence-initial capitalisation, errors with "lỗi", dropping "bạn".
- W3C i18n — w3.org/International/articles/article-text-size/ — the length-keyed expansion table.

## Evidence, provenance, and calibrated language

- ICD 203, amended 2022 — dni.gov/files/documents/ICD/ICD%20203%20Analytic%20Standards.pdf — the seven-term likelihood table, the no-mixing-rows rule, the observed/assumption/judgment distinction, the falsifier requirement. **ICD 206**, same set — the citation trigger. **[caveat]** dni.gov returned 403; the text came from an image-scan mirror at bmbs.org with OCR noise. Re-verify before hardcoding the table.
- Dhami et al. 2019 — journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0213522 — the strongest number here: bracketed ranges took overlap with intended meaning from 32% to 66% (N=924).
- Kesselman 2008 — gwern.net/doc/statistics/bayes/2008-kesselman.pdf — design principles only. **[caveat]** Figure 5.2 is an image, so its table is a secondary transcription; ICD 203's table is used.
- gwern.net/about — document-level "epistemic status" and the non-claim tags.
- Hullman 2020 — arxiv.org/pdf/1908.01697 — corrected: 76% replied **yes** to having depicted uncertainty in the last year, while most said 10% or less of their visualizations carried it.
- Correll 2019 — arxiv.org/pdf/1811.07271 — the provenance footer.
- Kim, Liao, Vorvoreanu, Ballard & Wortman Vaughan 2024 — arXiv:2405.00623 — the first-person voice rule, pre-registered (N=404): first-person uncertainty lowered confidence and agreement while raising accuracy.
- Grounded AI × Nature 2026 — groundedai.company/research/hallucinated-citations-nature-2026/ — the *estimated* prevalence of hallucinated citations. **arXiv:2605.07723** separately licenses the 111-million-reference figure.
- Gao et al., ALCE 2023 — arXiv:2305.14627 — a coverage metric over a binary pass.
- Anthropic, Citations API — platform.claude.com/docs/en/build-with-claude/citations — an anchor is a pointer plus a verbatim span.
- GitHub Docs — docs.github.com/en/repositories/working-with-files/using-files/getting-permanent-links-to-files — the SHA rationale and `blob/<commit_SHA>/<path>`.
- Pew Research Center 2024 — pewresearch.org/data-labs/2024/05/17/when-online-content-disappears/ — link rot requiring `data-retrieved` and `data-archive`.
- W3C PROV Model Primer — w3.org/TR/prov-primer/ — the Entity/Activity/Agent naming discipline. Vocabulary only.
- C2PA Specification 2.1 — spec.c2pa.org/specifications/specifications/2.1/specs/C2PA_Specification.html — the negative scoping decision: supported types are image, video, PDF, font, and ZIP containers; plain HTML lacks the container.
- Liu, Grossman & Zhai 2003 — cs.uic.edu/~liub/publications/KDD-03-techReport.pdf — the normalised edit-distance definition and its trained 0.3 threshold. **[self-reported]** the structural monotony ratio, the ≥5-member gate, and the calibration figures are our own, on n=6.

## Genre content: review, PR, incident, explanation

- Google eng-practices — google.github.io/eng-practices/review/reviewer/comments.html · /looking-for.html · /developer/cl-descriptions.html — the code-as-subject rewrite pair, Nit / Optional / FYI, the twelve review aspects in order, the CL first-line rules.
- Conventional Comments — conventionalcomments.org/ — the `<label> [decorations]: <subject>` grammar.
- Cisco case study — static0.smartbear.co/support/media/resources/cc/book/code-review-cisco-case-study.pdf — the LOC and duration ceilings, the 5-minute minimum, the defect rate.
- Bosu, Greiler & Bird 2015 — microsoft.com/en-us/research/wp-content/uploads/2016/02/bosu2015useful.pdf — the usefulness-density baseline and keyword table. The paper's claim is the strong one: questions and acknowledgment are more likely to be in *not useful* comments.
- Kubernetes PR template — raw.githubusercontent.com/kubernetes/kubernetes/master/.github/PULL_REQUEST_TEMPLATE.md — the five headings and the release-note block. **Angular** — raw.githubusercontent.com/angular/angular/main/.github/PULL_REQUEST_TEMPLATE.md — the breaking-change verdict.
- Diátaxis — diataxis.fr/explanation/ · /reference-explanation/ — explanation as understanding-oriented.
- Wikipedia, "Worked-example effect" — en.wikipedia.org/wiki/Worked-example_effect — the worked-example and expertise-reversal effects. The domain list is medium confidence.
- PagerDuty postmortem docs, Apache-2.0 — github.com/PagerDuty/postmortem-docs/blob/master/docs/how_to_write/writing.md (branch `master`) — a metric behind every timeline item, facts over evaluation, contributing factors over a single root cause (Richard Cook).
- Google SRE Book — sre.google/sre-book/example-postmortem/ — the canonical field list, section order, and blameless definition.
- Allspaw 2012 — jaytaylor.com/notes/node/1498058768000.html — the four-part account as the timeline row schema. **[caveat]** mirror; etsy.com returns 403.
- Howie — howie-guide.pagerduty.com/analyze/ — the counterfactual ban; hypotheses preserved as they were live.

## AI-prose tells

- Liang et al. excess vocabulary — arxiv.org/html/2406.07016v5 · github.com/berenslab/llm-excess-vocab — the excess-word list and per-word ratios. **[caveat]** the shipped ratios are **recomputed** against a 2022 baseline over the 407 style-annotated words: this reproduces the published 13.8 for "underscores" and diverges for "delves" (47.8 against 28.0). The ranking is reliable; absolute ratios are baseline-dependent.
- Em-dash prevalence, pre-registered (OSF HFT8C), n = 69,632 — arxiv.org/pdf/2606.29540 — the corpus-level rise, framed by its authors as "a population-level indicator, not a per-paper detector".
- Per-model em-dash rates — arxiv.org/pdf/2603.27006 — the human baseline the budget sits above. **[caveat]** single-author preprint, no peer review, 8 essays.
- Rhetorical devices — arxiv.org/pdf/2604.19768 — tricolon, erotema, hedging, device-distribution entropy.
- Negative parallelism — arxiv.org/pdf/2510.15061 — the 6.3x figure for "It's not X, it's Y", and the pink-elephant backfire.
- Co-occurrence — arxiv.org/pdf/2509.09596 — co-occurrence beating single words.
- Detector false positives — arxiv.org/pdf/2304.02819v3 — the false-positive rate on TOEFL essays.
- Localization — arxiv.org/pdf/2606.22735 — the shift concentrates in introduction and conclusion.
- Wikipedia, "Signs of AI writing" — en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing — the sentence-level patterns. A live guideline that drifts; snapshot it with a retrieval date.

## Skill authoring and prior art

- Anthropic, Skill authoring best practices — platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices — every structural number: body length, the Level 2 token ceiling, when a TOC is needed, references one level deep, the degrees-of-freedom dial.
- Anthropic, Claude Code skills reference — code.claude.com/docs/en/skills — the 1,536-character truncation and the frontmatter set.
- Anthropic, Prompting best practices — platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices — "Tell Claude what to do instead of what not to do", and reason attached to rule.
- anthropics/skills, `skill-creator` — github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md — the anti-MUST doctrine verbatim, and all-caps ALWAYS or NEVER as "a yellow flag".
- anthropics/skills, `frontend-design` — github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md — the brainstorm→critique→build gate and the AI-design clusters with literal hex. `web-artifacts-builder` licenses the named slop list.
- obra/superpowers, `writing-skills`, MIT — github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md — the Match-the-Form-to-the-Failure table, and the finding that a workflow-summarizing `description` becomes a shortcut agents take instead of reading the body. **[caveat]** the prohibition-backfire result publishes no data or sample sizes.
- nicobailon/visual-explainer, MIT — github.com/nicobailon/visual-explainer — the structural skeleton and ten slide types. The competitive delta: two templates load remote fonts and a `mermaid@11` bundle, and `grep` across all four returns 0 for `@media print`. Its keyboard handler covers both directions plus Home and End (`slide-deck.html:889-892`).
- ThariqS/html-effectiveness, Apache-2.0 — github.com/ThariqS/html-effectiveness — the plugin's cited source, from Thariq Shihipar's Anthropic article "The unreasonable effectiveness of HTML" (2026, claude.com/blog/using-claude-code-the-unreasonable-effectiveness-of-html). The twenty-format taxonomy and the measured single-file budgets. Its own gap: `@media print` appears in none of them.
- Reuse licences — AVivero/every-layout-skill MIT · Trystan-SA/claude-design-system-prompt MIT · maxsoweski/claude-design-skills MIT · ncase/polygons CC0-1.0 · edwardtufte/tufte-css MIT · susam/spcss MIT · system-fonts/modern-font-stacks CC0-1.0 · folke/tokyonight.nvim Apache-2.0 — direct reuse with attribution.
- Y2Z/monolith, CC0-1.0 — github.com/Y2Z/monolith — the escape hatch for a multi-file deck; Marp has no single-file bundling and recommends this pipe.
- hpcc-systems/hpcc-js-wasm, Apache-2.0 — npmjs.com/package/@hpcc-js/wasm-graphviz — the authoring-time-only Graphviz escape hatch. **[self-reported]** `dot`, `neato`, `d2`, `mmdc`, `plantuml` were absent on a stock macOS machine, hence the `command -v` check.
- mermaid-js/mermaid `packages/tiny`, MIT — github.com/mermaid-js/mermaid/tree/develop/packages/tiny — justifies the ban: the size-optimised build drops diagram types and KaTeX, and its docs recommend the full library. **[self-reported]** the byte measurements.
- alpinejs.dev/advanced/csp — the exclusion of Alpine: expressions run through the `Function` constructor, and the CSP-safe build gives up arrow functions, template literals, and window access. **[self-reported]** the bundle-size measurements.
- Huang et al. 2024 — arXiv:2310.01798 — deleting the 0-2 self-scoring rubric: models struggle to self-correct without external feedback. **Kamoi et al. 2024** — arXiv:2406.01297 — the boundary: it works with reliable external feedback. **[caveat]** direct.mit.edu returns 403; the arXiv version was verified.
- Cook et al. 2024 — arXiv:2410.03608 — the replacement: YES/NO checklists raised LLM-human exact agreement.
- Jang, Ye & Seo 2022 — arXiv:2209.12711 — an inverse scaling law on **negated task prompts**, not agentic instruction documents.

## Explicitly dropped, and why

Sixteen citations failed spot-checking in the first research pass and eighty-three in the second: statistics stated backwards, quotes absent from the source they were attributed to, one figure that was unsourceable and is deleted outright, and one PDF path that was fabricated. Every failure with a design consequence is a row here.

| Dropped | Reason |
|---|---|
| "76% had NOT depicted uncertainty" | Inverted. The paper says 76% **had**. Corrected above. |
| Paraphrases presented as Matuschak quotes | The three strings appear nowhere in the note. Real wording substituted. |
| Butterick rule 5 = "sentence spacing" | Rule 5 there is "don't use system/free fonts". The rest live on `summary-of-key-rules.html`. |
| Letterspacing and all-caps rules on `bold-or-italic.html` | On neither. Split across `letterspacing.html` and `all-caps.html`. |
| 24ways baseline-grid critique | The article contains no baseline-grid discussion. No substitute found. |
| The `file://` capability matrix as MDN-backed | MDN supports one line of it. The rest is relabelled `[self-reported]`. |
| tufte-css 240px / 32px / 5px / 62rem / "prose 42rem + aside 15rem" | tufte-css uses percentages and 760px. Relabelled `[self-reported]`. |
| MDN `<details>` as the source for print behaviour | MDN says nothing about print or `beforeprint`. Relabelled; URL corrected. |
| "visual-explainer handles only forward keys" | False. Both directions plus Home and End. Corrected. |
| "111 million references / 146,932 hallucinated citations" on Grounded AI | Belongs to arXiv:2605.07723. Split. |
| "NeurIPS 2025: 100 fabricated citations passed 3-5 expert reviewers" | On neither source; unsourceable. **Deleted entirely.** |
| "found more than 110,000 publications" | Extrapolation from 4,000 sampled to ~7M. Reworded to "estimated". |
| GitHub line anchors / `?plain=1` on the permalinks page | They live on the code-snippet page. Both URLs cited. |
| PagerDuty `main` branch URL | 404s; the default branch is `master`. Corrected. |
| Trystan-SA tells on `hierarchy-rhythm-review.md` | Six of eight are in `ai-slop-check.md`. Reattributed. |
| The "brutalist CSS recipe" on brutalist-web.design | `curl … \| rg -c '0000ee\|border-radius'` returns 0; the site runs Tachyons. CSS relabelled. |
| lol-html README as the source for "tokenizer, skips tree construction" | Not in the README or docs.rs. Reattributed to the Cloudflare post. |
| "structural monotony ratio" on KDD-03 | The paper supplies ND and 0.3. The rest is relabelled `[self-reported]`. |
| IPCC AR5/AR6 uncertainty guidance | 403 on three PDF URLs; bands secondary only. **Dropped**; ICD 203 is used. |
| Harp & Mayer (1998) DOI | Constructed from a citation, never fetched. **Dropped**; Kienitz 2023 replaces it. |
| Boy, Détienne & Fekete (CHI 2015), full text | Every host blocked: HAL returns the Anubis interstitial on the landing page, `/document` and `/file/paper1717.pdf`; ACM DL 403s; Semantic Scholar reports the abstract "elided by the publisher"; Crossref carries none. **Body dropped.** The abstract survives through OpenAlex's inverted index (doi:10.1145/2702123.2702452) and licenses the direction alone — `data-story.md` states it without quotation marks and with no magnitude. An earlier draft quoted "augmenting exploratory visualizations with introductory 'stories'…" as verbatim; the word *exploratory* could not be confirmed in that sentence, so the quotation was removed rather than repaired. |
| Boy et al., "Suggested Interactivity" (2016) | PDF unretrievable; the winning cue is unknown. **Dropped** — the largest remaining gap for the interactive tier. |
| HTML5 Doctor on `blockquote cite` | Search-summary only. The verified MDN finding carries the conclusion. |
| UML sequence "initiator leftmost" | uml-diagrams.org supports only the weaker ordering statement. Kept as a house rule. |
| Duarte three-second test as the source of a word limit | The page gives the principle and no number. Word thresholds are our heuristic. |
| "automated tools catch 30-57% of accessibility issues" | No published figure verified. **State no number.** |
| Project Wallace medians as artifact thresholds | They describe whole sites (median 164 colours). Cited only as why distinct-value counts signal anything. |
| `zcliu.org/vistitles/…` PDF path | Fabricated. **Deleted**; cite doi:10.1145/3290605.3300576 and label its magnitudes unverified. |
| Wikipedia BLUF article as the source of the keyword set | It names three keywords and has no flyer example. Replaced by the HBR article. |
| "Use inductive at the top level by default" attributed to Minto | Millerd's own beginner framing. Attribute to him or drop it. |
| Cisco study, "20-30% improvement from author preparation" | The figure does not exist in the paper. **Deleted.** |
| Bosu 2015 read as "questions are not more likely to be in useful comments" | The claim is stronger: they are more likely to be in *not useful* comments. |
| Angular PR type "app-infra" | Upstream reads "angular.dev application / infrastructure changes". Corrected. |
| RFC 7322 IANA Considerations as required | "[Required in I-D]" only. Corrected. |
| W3C images `/complex/` as the decision-tree page | The tree is at `/decision-tree/`. Both cited for their own content. |
| 125-character alt-text cutoff | Retracted by its own author, no replacement number. **Deleted.** |
| Pooled meta-analytic effect size for text structure | Publisher-elided. Ship the five individual d values. |
| Borkin et al. on title recall · Nature and Cell figure-legend guidance | Never retrieved. **Dropped.** |
| Shopify Polaris `actionable-language` · Atlassian writing guidelines | Retired (301s); client-rendered, empty body. **Dropped.** |
| Amazon six-pager section list · Bezos 2004 PowerPoint-ban email | Secondary blogs only. **Dropped**; the 2017 letter carries the claim. |
| Miller's "magical number seven" | The modern consensus is roughly four chunks (Cowan 2010). Caps are 2-5. |
| Strunk & White on the passive | The showcase example is refuted in print; Pullum finds liberal passive use in Strunk, White and Orwell. |
| "delves" at 28.0x as a published ratio | Our recomputation against a 2022 baseline gives 47.8. Label ratios recomputed. |

## What the evidence does not support

Each item prints as a one-line caveat beside the rule it qualifies, in the shipped files, not only here.

**Readability formulas are Goodhart-vulnerable by construction. Set no target and report no grade level.** Word length stands in for semantic difficulty and sentence length for syntactic complexity, so the two things a writer trivially games are exactly the two inputs. Empirically, simplifying word choice in human essays raised AI-misclassification from 5.19% to 56.65%.

**The passive-voice folk rule is folklore, and shipping it causes a correctness failure rather than a style failure.** Three independent sources agree passive is correct when the actor is unknown, when the actor is irrelevant, when the patient is the paragraph's topic, and when one action follows another as policy; the detection heuristic is unreliable in both directions. In incident writing before root cause is known, an active-voice rule manufactures an agent — a fabricated claim this plugin's own evidence gates would certify. Hence no passive detector ships.

**Every AI-tell word below about 2x is unmeasured or measures nothing.** "this", "these", "while", "through", "into", "using", "their", "analysis", "research", "potential", "findings", "various", "approach", "outcomes", "impact", "conducted", "revealed", "demonstrated" all sit at 1.1-1.4x on the published excess list, which ranks by absolute gap. They are ordinary English. Flag on ratio, and treat the ranking rather than the absolute ratio as the reliable part.

**Every multi-word AI phrase except one is folklore.** The measured dataset is unigram-only, and the one exception with a published number is "It's not X, it's Y" at 6.3x. "It is worth noting", "serves as", "plays a crucial role", "stands as a testament", "In today's fast-paced world", and "In conclusion" come from curated community lists and appear in no retrieved corpus study. They ship labelled folklore, because they are cheap to avoid and a false positive costs one rewritten sentence.

**The em-dash human baseline is thin.** Eight modern essays (57,232 words) plus five 19th-century novels; Twain and Melville are not a representative human corpus. The budget of 4 per 1,000 words sits just above the modern median of 3.83, and no per-document threshold can be a measured boundary between human and machine, because the strongest study on the question says so in its own words: "a population-level indicator, not a per-paper detector."

**These thresholds are ours, from n = 6 calibration on this plugin's own examples plus synthetic fixtures, all authored by the same hand, and from no publication**: the card-soup ratio 0.50 with its 5-member group floor, the token-count ceilings, the 25-90 word scene budget, paragraph-length CV ≥ 0.45, section-length ratio ≥ 2.0, three-item-list share ≤ 0.5, ≤1 annotation per 5 lines, and the ≤14-word heading cap. The findings behind them are measured — device-distribution entropy d = 0.74, tricolon d = 0.95, the 2-line and 28pt headline prescriptions — and the numbers linted against are inferred. Every message that fires on them says so, the measured ratio prints beside the verdict, and each is a warning rather than an error. Recalibration waits for ~30 real artifacts including known-bad ones.

**No study measures answer-first against answer-last on expert technical readers.** BLUF is a military regulation, and the nearest experimental evidence is a 1997 usability test on a tourism website with 51 participants plus text-structure research on ninth-graders, college learners, and older adults. The claim to make is "standard practice, backed by adjacent reading research". Vincent (1985) found that for untrained readers with average vocabulary a collection of descriptions produced better recall than a comparison structure, and no study tests that boundary on experts.

**The assertion-headline evidence comes from presented slides with narration, not from a read document.** Alley et al. 2006 and Garner & Alley 2013 both measured a lecture, and the title-framing evidence measured single charts, so transfer to a scrolling HTML report is inference. The closest read-medium evidence, NN/g's scannability work, tests front-loading and concision rather than assertion form.

**The magnitudes behind the title-misalignment credibility claims are unverified.** The paper is real and closed-access; the counts, chi-squares, and credibility deltas came from a fabricated PDF path. The direction is supported by the published abstract. Ship the direction, labelled.

**The four-level chart-description model was validated on charts alone.** Applying it to architecture diagrams, screenshots, tables, or code excerpts is analogy. The screenshot caption formula extrapolates from the W3C two-part model plus WebAIM's prefix ban, and no retrieved source covers software-UI screenshots.

**The redundancy effect is cited from a secondary source.** No primary literature (Chandler & Sweller; Mayer's redundancy principle) was retrieved. State the cost qualitatively — repetition raises extraneous load and harms the sighted reader too — and attach no effect size.

**No source gives a Vietnamese-specific text-expansion percentage.** The expansion table is length-keyed and omits Vietnamese. The diacritic line-height requirement and the multi-syllable word-break risk are reasoned from the writing system rather than measured.

**Scroll-depth data does not describe this plugin's readers.** The 50%-median figure is consumer web traffic. Nothing retrieved establishes that a colleague opening a code review behaves like a Slate reader, and nothing establishes how much of a document an LLM-assisted reader consumes when the downstream consumer is itself a model.

**The anti-slop list is a lagging indicator by construction, and ban-by-literal-value is bypassable.** The purple gradient was the 2024 tell, the warm-cream/serif/terracotta cluster is the 2026 tell, there will be a 2027 one, and this plugin's own five voices could become it. `#6366f2` clears the indigo grep and `border-radius: 11px` clears the radius grep. What the greps catch is unreflective output, which is the actual failure mode. The durable gates are the voice rotation rule, the `Generic-check` contract key, and a dated review interval on `typography-and-voice.md`.

**The contract gate is gameable, and the honest claim is narrow: it converts a silent skip into a visible lie.** A model can write `Generic-check: nothing was generic` and proceed, and there is no airtight mitigation. The validator checks that the block exists with every key filled past a length floor, and a visible lie is something a human reviewer catches, which a silent omission is not. Claim that, and nothing more.

**The default path renders nothing, and the validator prints a NOT-CHECKED block saying so.** Layout overflow, clipped text, collisions, contrast after the cascade, target size under transforms, and keyboard behaviour need a browser. That block is non-optional output tested by CI, and the gate step reads "Run the syntactic gate — it checks HTML hygiene and structure only and cannot judge truth, hierarchy, or evidence." An optional chrome-devtools or playwright escalation is offered and never required. Dropping the scope block for brevity regresses the plugin to the failure it exists to fix.

## Scope decisions, each with its reason

- Zero npm dependencies in the validator, because a gate that needs `npm install` does not run. axe-core stays out on its own README's evidence and contributes its rule logic and rule-id vocabulary, so a message here lines up 1:1 with a third-party audit.
- WCAG 2.2 AA is the operative bar; APCA is advisory.
- `data-*` attributes carry evidence. C2PA is spec-confirmed inapplicable to HTML, and `schema.org/Claim` models third-party fact-checking rather than first-party evidence attachment.
- Vanilla JS, event delegation, and one idempotent `render()`. Mermaid, D3, Chart.js, htmx, Alpine, and React stay out of the artifact.
- A multiple-based spacing system replaces baseline-grid snapping, because CSS cannot read font baseline metrics.
- One `.html` that opens by double-click: no multi-file output, no build step, no server, no persistence by default. These are one-shot deliverables read by a colleague, printed, and archived, so component APIs, theming layers, and reusable libraries stay out.
- A chart appears when the artifact contains a quantitative series, and the Amar-task step names the task it serves. When the only task is Retrieve Value, a table beats every chart: say so and ship the table.
- vnu, Java, Graphviz, and Chrome are detected and used when present, skipped silently when absent.
- Self-assessment is the validator's checks plus the binary gate lines in each `SKILL.md`, answered in text. A holistic scoring table is a reviewer's instrument rather than the author's, and the reviewer pass runs outside this plugin, so no rubric file ships here.

## Directed freedom

The plugin's central design stance is directed freedom:

- The author controls the opening, sequence, hierarchy, and verdict.
- The reader controls depth, comparison, filtering, and evidence inspection.
- The interface returns the reader's choices to the work through an explicit export.

This is why the plugin separates four genres. A report directs reading, a deck directs pacing, an explorer supports comparison, and an editor captures intent. They share a quality bar, not a page template.
