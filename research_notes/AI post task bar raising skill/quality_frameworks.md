# Cross-domain quality-raising frameworks and "perfectize" (when to stop), ranked by transfer to a solo AI agent

Scope note: read-only web research, 2026-10-25. About 40 search/fetch calls (over the 15-call guideline; the question list was broad). Many primary sources were blocked (NEJM 403, PubMed cookie wall, Merriam-Webster 403, HBR paywall, O'Reilly 403), so several claims rest on secondary summaries and are labeled accordingly. Labels: **HIGH** = I read the page/abstract myself this session; **MEDIUM** = consistent secondary reports or search-result summaries, primary not opened; **LOW** = could not open a source or inferred. "Transfer=" is a separate rating: how well the mechanism works for one AI agent alone in one session.

---

## 1. Which post-first-draft mechanisms do high-reliability and creative fields use, with evidence, failure modes, and transferability to a solo AI agent?

### Takeaway
The mechanisms with the best-documented outcomes are short, forced checklists at a defined pause point (WHO/Pronovost) and an explicit, binary "done" bar (Scrum DoD, rubrics). Mechanisms that need a second human mind (Braintrust, red team, CRM readbacks, devil's advocate) lose most of their power when one agent reviews its own work. The best transfers are those that convert to a written artifact the agent can execute alone: bar, checklist, pre-mortem prompt, severity triage, level-ordered passes.

### Cited Findings

#### A. Surgical checklist and pause points (Haynes / Gawande / Pronovost)
- WHO 19-item surgical safety checklist, 8 hospitals, 3,733 patients before vs 3,955 after: deaths fell 1.5% to 0.8% (P=0.003), inpatient complications 11.0% to 7.0% (P<0.001). Design is before/after, not randomized. — [Haynes et al., NEJM 2009 via Europe PMC](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:19144931%20AND%20SRC:MED&resultType=core&format=json), DOI https://doi.org/10.1056/NEJMsa0810119 — **HIGH**
- Replication failure: Ontario (Urbach, NEJM 2014), 101 hospitals, 109,341 surgeries before and 106,370 after, adjusted death risk 0.71% before vs 0.65% after, no significant improvement on any outcome. — [Hospitalist summary](https://blogs.the-hospitalist.org/content/surgical-checklists-failed-improve-outcomes); [Incidental Economist](https://theincidentaleconomist.com/wordpress/when-checklists-work-and-when-they-dont/) — **MEDIUM** (NEJM paper not opened)
- Leape's accompanying editorial attributed the Ontario null to the checklist "not actually used", and noted a 3-month window was too short for an effect. — [Hospitalist summary](https://blogs.the-hospitalist.org/content/surgical-checklists-failed-improve-outcomes) — **MEDIUM**
- Pronovost ICU central-line bundle (hand washing, full-barrier precautions, chlorhexidine, avoid femoral site, remove unneeded catheters): median catheter-related bloodstream infection rate fell from 2.7 per 1,000 catheter-days to 0 within about 3 months, held through 18 months, about 103 ICUs in 67 hospitals (counts vary by source). — [AHRQ PSNet](https://psnet.ahrq.gov/issue/intervention-decrease-catheter-related-bloodstream-infections-icu) — **MEDIUM**
- Gawande/Boorman distinction: READ-DO (step-by-step, order critical) vs DO-CONFIRM (work from memory, then stop and verify at a pause point). — [Grossi review](https://www.stevegrossi.com/on/the-checklist-manifesto); [Chua sketch notes](https://sachachua.com/blog/2015/03/sketched-book-checklist-manifesto-get-things-right-atul-gawande/) — **MEDIUM** (book not opened)
- Length guidance "5 to 9 items" and "60 to 90 seconds before a checklist becomes a distraction; keep killer items": reported by summaries, not confirmed in the book. — [Meppe summary](https://janmeppe.substack.com/p/how-to-make-a-good-checklist); [Shortform](https://www.shortform.com/blog/types-of-checklists/) — **LOW**
- Failure modes: checklist not actually used / ticked without engagement (Ontario); the effect needs team and culture change (Urbach conclusion). — [Hospitalist summary](https://blogs.the-hospitalist.org/content/surgical-checklists-failed-improve-outcomes) — **MEDIUM**

#### B. Toyota jidoka / andon / kaizen / 5 whys
- Jidoka is "automation with a human touch": machines or operators stop production when an abnormality appears, preventing defective output. Andon lights up when equipment stops or a worker pulls the stop cord. Toyota says "all employees implement daily incremental kaizen", and that kaizen on work is "the bedrock of jidoka". — [Toyota Global, Production System](https://global.toyota/en/company/vision-and-philosophy/production-system/) — **HIGH**
- Toyota's page describes jidoka as "clearly detecting abnormalities and preventing them from recurring". The page does not mention the Five Whys. — [Toyota Global](https://global.toyota/en/company/vision-and-philosophy/production-system/) — **HIGH** (that the page omits it)
- Amazon leadership principle (a corporate analogue of the ratchet): "Leaders have relentlessly high standards — many people may think these standards are unreasonably high." Fetch summary: leaders keep raising the bar, stop defects from reaching later stages, and fix problems so they stay fixed. — [Amazon Leadership Principles](https://www.amazon.jobs/content/en/our-workplace/leadership-principles) — **HIGH** (quoted sentence), **MEDIUM** (summary of remainder)
- No quantified outcome evidence for andon/kaizen/5 whys was retrieved. — see Gaps

#### C. Definition of Done
- Scrum Guide: DoD is "a formal description of the state of the Increment when it meets the quality measures required for the product." "Work cannot be considered part of an Increment unless it meets the Definition of Done." An item that fails DoD "cannot be released or even presented at the Sprint Review" and returns to the backlog. — [Scrum Guide](https://scrumguides.org/scrum-guide.html) — **HIGH**
- The Guide says DoD "creates transparency" via shared understanding of what was completed. It cites no empirical effectiveness study. — [Scrum Guide](https://scrumguides.org/scrum-guide.html) — **HIGH**

#### D. Pre-mortem (Klein) and inversion (Munger)
- Pre-mortem steps: team briefed on plan; leader asks the team to "imagine that the proposed plan has failed"; everyone generates reasons for the failure. The page claims wide business use and cites no measured effectiveness. — [Gary Klein, Premortem](https://www.gary-klein.com/premortem) — **HIGH**
- HBR 2007 summary: "team members assume that the project they are planning has just failed"; aim to make it "safe for dissenters". Full text paywalled. — [HBR](https://hbr.org/2007/09/performing-a-project-premortem) — **HIGH** (summary only)
- The "prospective hindsight raises ability to identify reasons for outcomes by 30%" figure is attributed to Mitchell, Russo and Pennington (1989, J. Behavioral Decision Making) via Klein's HBR piece, but I could not open the HBR text or the 1989 paper; only secondary snippets. — [HBR Guide excerpt (not opened)](https://www.safaribooksonline.com/library/view/hbr-guide-to/9781422187319/14-chap5.xhtml) — **LOW**
- Munger's inversion credits Jacobi ("invert, always invert"); one commentary notes Jacobi was speaking about mathematics. Exact book location unverified. — [major.io notes on Poor Charlie's Almanack](https://major.io/p/poor-charlies-almanac/); [Stockopedia](https://www.stockopedia.com/content/invert-always-invert-69794) — **MEDIUM**

#### E. Red team, murder board, devil's advocate
- Schweiger, Sandberg and Ragan: groups using dialectical inquiry or devil's advocacy made higher-quality decisions than consensus groups (1989 longitudinal study of middle managers), with lower acceptance of the group decision; no difference between DI and DA; replications differ (Chanin & Simko 1991 favored DI; Schwenk & Valacich 1994 found DA's edge larger for individuals than groups). — [Strategic Management Journal 1989 record](https://ideas.repec.org/a/bla/stratm/v10y1989i1p31-43.html) — **MEDIUM** (abstract-level, via search summary)
- Nemeth, Brown and Rogers 2001 (Eur. J. Social Psychology 31:707-720): an authentic minority dissenter outperformed all three forms of role-played devil's advocate; authors note authenticity is hard to clone by role-playing. — [Zendy record of DOI 10.1002/ejsp.58](https://zendy.io/title/10.1002/ejsp.58) — **MEDIUM**
- No primary evidence retrieved for military "red team" or "murder board" formats. — see Gaps

#### F. Pixar Braintrust and dailies
- Braintrust: peer feedback on work in progress; it has no authority over the director, who need not follow any suggestion; candor is the basis; early work called "ugly babies"; meets every few months per film; formed during Toy Story 2. — [Mindset summary of Catmull](https://mindsetonline.com/ed-catmull-pixar-30-years-braintrust-ugly-work-early/); [Fast Company](https://www.fastcompany.com/3027135/inside-the-pixar-braintrust); HBR 2008 article abstract at [HBR store](https://store.hbr.org/product/how-pixar-fosters-collective-creativity/R0809D) — **MEDIUM** (summaries, book/HBR text not opened)
- No outcome study of Braintrust effectiveness found; evidence is the founder's testimony. — **MEDIUM**

#### G. Code review standard (Google)
- "reviewers should favor approving a CL once it is in a state where it definitely improves the overall code health", "even if the CL isn't perfect." — [Google eng-practices](https://google.github.io/eng-practices/review/reviewer/standard.html) — **HIGH**
- "there is no such thing as 'perfect' code—there is only better code"; seek "continuous improvement". — same page — **HIGH**
- Non-critical comments should be prefixed "Nit:"; "Technical facts and data overrule opinions and personal preferences."; do not let a change sit because of disagreement. — same page — **HIGH**
- Cisco/SmartBear study of 2,500 reviews / 3.2M LOC: review effectiveness reportedly drops beyond about 200-400 LOC and roughly 60-90 minutes per session (thresholds vary by source; vendor-run, single-team data). — [SmartBear best practices](https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/); [CM Crossroads](https://cmcrossroads.com/article/largest-case-study-code-reviews-ever) — **MEDIUM**

#### H. Aviation CRM
- Salas et al. 2006 (Human Factors) is a narrative review of 28 CRM evaluations across aviation, medicine, oil, maritime, nuclear: positive trainee reactions, mixed learning and behavior effects, could not establish organizational safety outcomes. O'Connor et al. 2008 meta-analysis (16 studies): large effect on attitudes and behaviors, medium on knowledge. — [AHRQ PSNet](https://psnet.ahrq.gov:443/issue/does-crew-resource-management-training-work-update-extension-and-some-critical-needs); [Galway repository, O'Connor 2008](https://research.universityofgalway.ie/en/publications/crew-resource-management-training-effectiveness-a-meta-analysis-a-3/) — **MEDIUM**
- Readbacks/challenge-and-response specifics: not retrieved. — see Gaps

#### I. Multi-pass editing and design critique
- "The Levels of Edit" (Van Buren and Buehler, JPL publication 80-1, 2nd ed. 1980) exists as a catalogued framework for graded editing levels; I could not read its content. — [NSW State Library catalogue record](https://devfeature-collection.sl.nsw.gov.au/record/74VvRQ0oWGbg) — **HIGH** (existence), content **LOW**
- No sources retrieved for structural-to-line-to-proofread ordering evidence or design-critique protocols. — see Gaps

### Inferences
Transfer= rates fit for a single agent alone in a single session; Conf= is confidence in the rating.

| Mechanism | Core to preserve for an AI | Transfer= | Conf= | Main failure mode to design against |
|---|---|---|---|---|
| Explicit Definition of Done / written bar | Binary, checkable criteria written before the review pass; an item failing the bar goes back, it is not "presented" | HIGH | MEDIUM | Criteria drift away from the user's goal (Goodhart), see Q3 |
| Pause-point checklist (DO-CONFIRM) | After work is done, stop and confirm a short list of killer items, each with evidence | HIGH | MEDIUM | Ticked without checking (Ontario); long lists lose attention |
| Pre-mortem / inversion | "Assume this shipped and failed; list causes" then fix top causes | HIGH | MEDIUM-LOW (effect size unverified) | Same-model blind spots; produces generic risks |
| Jidoka stop-the-line + root cause | On any found defect: stop, fix cause class, add a check so it cannot recur | HIGH | MEDIUM | Fixing symptom only; endless line-stopping on trivia |
| Google "approve at better, not perfect" + Nit label | Severity triage; below-threshold items are optional notes, not blockers | HIGH | MEDIUM (practice standard, no trial found) | Severity inflation by the reviewer |
| Multi-pass by level | Structure first, then line, then proofread, so cheap polish is not done on content that will change | HIGH | LOW (no source retrieved; plausible) | Re-opening settled decisions in late passes |
| Devil's advocate / red team / Braintrust | Needs independence; role-played dissent is weaker than authentic (Nemeth) | LOW-MEDIUM alone; MEDIUM if a fresh-context subagent with a different mandate does the pass | MEDIUM | Same weights, same context, agreement bias |
| CRM readback / challenge-response | Requires two parties | LOW | LOW | Not available to a solo agent |
| Dailies / Braintrust cadence | Requires peers and time spread | LOW | LOW | Not available in a single session |

- A pause-point checklist is the closest human analogue to an after-task skill; Ontario shows the failure is non-use, so the skill must make the checklist output verifiable (evidence per item). — inferred from Haynes vs Urbach, **MEDIUM**
- Because a solo agent cannot supply authentic dissent, the independence element has to be simulated structurally (fresh context, adversarial mandate, different inputs). — inferred from Nemeth 2001, **MEDIUM-LOW**

### Gaps
- No quantified effectiveness study found for andon, kaizen, 5 whys, red team, murder board, Braintrust, aviation readbacks, design critique, or multi-pass editing order. The Five Whys appears nowhere on Toyota's page; primary source (Ohno) not opened.
- Klein pre-mortem effectiveness: only the unverified 30% "prospective hindsight" figure; primary 1989 paper and any Veinott/Klein pre-mortem experiment not opened.
- Amazon Bar Raiser process details deliberately not researched beyond the leadership-principle text (scope: one entry only).
- Haynes and Urbach primary pages inaccessible this session (403 / cookie wall); Haynes numbers come from Europe PMC (HIGH), Urbach from secondary reports.

---

## 2. What does research say about perfectionism, satisficing, diminishing returns and the planning fallacy as they bear on WHEN to stop, and which 4-6 operational stopping rules follow?

### Takeaway
Holding a high explicit standard ("strivings") is associated with better performance, while open-ended self-critical evaluation ("concerns") adds hours without adding performance. Satisficing, measure-before-optimizing, severity-gated review and a clear-criteria condition for refinement loops all point to the same operational pattern: define the bar first, stop when it is met and no remaining finding exceeds a severity threshold, and cap the number of passes by stakes.

### Cited Findings
- Meta-analysis (Bellam and Curran 2025, J. Occupational and Organizational Psychology 98(3); 28 samples, 77 effect sizes, N=9,560): perfectionistic strivings correlated with hours worked and with work performance; perfectionistic concerns correlated with hours worked but not with work performance. — [LSE Research Online](https://researchonline.lse.ac.uk/id/eprint/128910) — **HIGH**
- Harari et al. 2018 (J. Applied Psychology, "Is Perfect Good?") found perfectionism relates to motivation, engagement and hours worked but with an equivocal relationship to job performance. — [UF Warrington write-up](https://warrington.ufl.edu/news/perfect-employees-beware-your-perfectionism-might-be-detrimental/); [abstract record](https://cris.iucc.ac.il/en/publications/is-perfect-good-a-meta-analysis-of-perfectionism-in-the-workplace/) — **MEDIUM**
- Iyengar, Wells and Schwartz 2006 (Psychological Science): job-seeking "maximizers" got starting salaries about 20% higher than satisficers but were less satisfied and had more negative affect; the authors tie it to fixation on realized and unrealized options. — [Swarthmore repository](https://works.swarthmore.edu/fac-psychology/104/) — **MEDIUM**
- Simon 1956 (Psychological Review 63(2):129-138): organisms "satisfice" rather than "optimize"; decision makers set an aspiration level and accept the first alternative that clears it (secondary description). — [Behavioral Economics encyclopedia](https://www.behavioraleconomics.com/resources/mini-encyclopedia-of-be/satisficing/) — **MEDIUM**
- Planning fallacy (Buehler, Griffin, Ross 1994, JPSP 67(3):366-381): 37 honors students predicted about 33.9 days (best estimate) and took about 55.5 days; roughly 30% finished on their predicted date; the bias appeared for own tasks but less for other people's tasks (figures vary by source). — [Buehler et al. 1994 PDF (search result, not opened)](https://bear.warrington.ufl.edu/brenner/mar7588/Papers/buehler-et-al-1994.pdf); [Planning fallacy overview](https://en.wikipedia.org/wiki/Planning_fallacy) — **MEDIUM**
- Knuth 1974: the "premature optimization" line sits in a passage about noncritical code; the critical ~3% should not be passed up; a common reading is "measure first, then optimize". — [MathWorks blog on Knuth 1974](https://blogs.mathworks.com/steve/2009/08/27/knuth-on-go-to-1974/); [Skarupke analysis](https://probablydance.com/2025/06/19/revisiting-knuths-premature-optimization-paper/) — **MEDIUM**
- Wilson and Schooler 1991 (JPSP 60(2):181-192): students who analyzed reasons for jam preferences (Study 1, n=49) or all attributes of courses (Study 2, n=243) matched expert opinion less well than controls; mechanism proposed: focus on salient but irrelevant features. — [AcaWiki summary](https://acawiki.org/Thinking_Too_Much:_Introspection_Can_Reduce_the_Quality_of_Preferences_and_Decisions) — **MEDIUM** (replication record not checked)
- Review fatigue: code-review defect detection reportedly falls past roughly 200-400 LOC and about an hour. — [SmartBear](https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/) — **MEDIUM**
- Google's rule: approve at "definitely improves" rather than perfect; label non-critical items "Nit". — [Google eng-practices](https://google.github.io/eng-practices/review/reviewer/standard.html) — **HIGH**
- Anthropic: the evaluator-optimizer loop "is particularly effective when we have clear evaluation criteria" and "when iterative refinement provides measurable value"; good fit when responses can be clearly improved by feedback and the LLM can give that feedback. — [Anthropic, Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) — **HIGH**
- Goodhart/Strathern: "When a measure becomes a target, it ceases to be a good measure" appears on p. 308 of Strathern 1997 (European Review 5(3):305-321); attribution of the phrasing to Hoskin 1996 is unverified. — [Strathern 1997 PDF (Gwern mirror)](https://www.Gwern.net/doc/statistics/decision/1997-strathern.pdf); [FORRT glossary](https://forrt.org/glossary/english/goodhart_s_law/) — **MEDIUM**
- Pareto/diminishing-returns as a general law: no primary source retrieved; only the SmartBear review-size data and Knuth's 97/3 framing above. — see Gaps

### Inferences
Operational stopping rules (each is a synthesis, not a finding from a single study):

1. **Bar-met rule (satisficing).** Write the bar (3-7 binary criteria) before polishing; stop when every criterion is met with evidence. Basis: Simon aspiration level, Scrum DoD, Anthropic "clear evaluation criteria". Conf=MEDIUM.
2. **Severity-gate rule.** Stop when a full pass finds zero items at or above severity X (e.g., "would change the user's decision or breaks a stated requirement"); items below X are listed as optional "nits", not fixed. Basis: Google standard + Nit label. Conf=MEDIUM.
3. **Pass-cap rule.** Hard cap of N passes (suggest 2-3 for routine tasks) and a per-pass size cap, because review yield falls with size and time. Basis: SmartBear/Cisco data, Gawande length guidance (LOW). Conf=MEDIUM-LOW.
4. **Diminishing-yield rule.** Stop early if a pass yields no new item at the threshold, or if its edits cannot be traced to a bar criterion (edits not tied to the bar are the over-polishing signature). Basis: strivings-vs-concerns (hours without performance), Wilson and Schooler, Goodhart. Conf=LOW-MEDIUM.
5. **Measure-before-polish rule.** Only optimize or rewrite something with evidence (a failing check, a found defect, a measured cost) that it matters; leave the rest. Basis: Knuth. Conf=MEDIUM.
6. **Stakes-scaled budget.** Extra passes (pre-mortem, independent review) only when the action is hard to reverse or the output feeds downstream work; trivial or reversible tasks get one pass. Basis: Anthropic ("measurable value"), Toyota (stop defects before they propagate), user's own pre-mortem rule. Conf=MEDIUM-LOW.

Cost of over-polishing, mapped to an AI agent: extra passes burn tokens and time without performance gain (concerns pattern, HIGH-quality meta-analysis but human workers), can change correct things (Wilson and Schooler, human preferences), and can swap the user's goal for the proxy (Goodhart). The human wellbeing cost of maximizing (Iyengar) does not transfer. — **MEDIUM-LOW**

The planning fallacy affects estimates of one's own tasks more than others' (Buehler 1994), so an outside-view check (a fresh-context reviewer, reference to similar past tasks) is the matching debias. — inferred, **LOW**

### Gaps
- No peer-reviewed source retrieved for the Pareto principle or a quantified diminishing-returns curve for revision passes in writing or analysis; only code-review data (vendor-run).
- No study retrieved on optimal number of revision passes.
- Replication status of Wilson and Schooler 1991, Iyengar 2006, and Buehler 1994 numbers not checked; Simon 1956 not opened directly.
- Whether Harari 2018 split strivings/concerns: snippets did not confirm.

---

## 3. What does "raising the bar" mean operationally, and is there evidence that an explicit written bar plus exemplars beats vague "be careful"?

### Takeaway
Operationally it has four parts: an explicit bar, a ratchet (a found defect leads to a permanent new check), calibration, and an independent judge. The best direct evidence is for written rubrics (pooled g=0.45 on performance in education); I found no direct evidence for exemplars beating rubrics alone, nor any AI-agent study of "explicit bar vs be careful".

### Cited Findings
- Meta-analysis of rubrics (Panadero, Jonsson, Pinedo, Fernández-Castilla 2023, Educational Psychology Review 35(4)): academic performance g=0.45 (k=21, m=54; abstract reports CI [0.312, 0.831], which does not center on 0.45, so check the paper); standardized mean change 0.38, CI [0.02, 0.75]; self-regulated learning g=0.23, CI [-0.15, 0.60]; self-efficacy g=0.18, CI [-0.81, 0.91]; "most of the moderator variables were not significant". — [Deusto repository abstract](https://deustoteka.deusto.es/items/59022074-df96-4c6a-8c52-3aa513c0ae3e/full) — **HIGH** (abstract read; internal CI oddity noted)
- Earlier rubric reviews were narrative, so effect strength was unknown before the 2023 meta-analysis. — [Springer record](https://link.springer.com/10.1007/s10648-023-09823-4) — **MEDIUM**
- A direct comparison with scripts (n=69 pre-service teachers): scripts raised learning self-regulation, rubrics lowered performance/avoidance self-regulation, no significant effect on performance or self-efficacy. — [Panadero, Alonso-Tapia and Reche 2013 record](https://helvia.uco.es/handle/10396/27304) — **MEDIUM**
- DoD: shared, formal description of required quality; non-conforming work cannot be presented or released. — [Scrum Guide](https://scrumguides.org/scrum-guide.html) — **HIGH**
- Ratchet analogues: Toyota daily incremental kaizen and jidoka's "preventing them from recurring"; Amazon "relentlessly high standards", fix problems so they stay fixed. — [Toyota Global](https://global.toyota/en/company/vision-and-philosophy/production-system/); [Amazon](https://www.amazon.jobs/content/en/our-workplace/leadership-principles) — **HIGH** (sentences quoted), **MEDIUM** (Amazon paraphrase)
- Independent judge in AI workflows: the evaluator-optimizer pattern assumes a second LLM call giving feedback against clear criteria. — [Anthropic](https://www.anthropic.com/engineering/building-effective-agents) — **HIGH**
- Written bars can backfire: Goodhart/Strathern ("ceases to be a good measure"); the Scrum Guide text I read does not address this risk. — [Strathern 1997](https://www.Gwern.net/doc/statistics/decision/1997-strathern.pdf) — **MEDIUM**

### Inferences
- The strongest transferable claim is that a written, shared, binary bar beats an unspecified standard. Rubric meta-analysis supports "explicit criteria help performance" (moderate effect) but is from human students; transfer to AI is plausible because LLMs follow stated criteria, yet unmeasured here. Conf=MEDIUM-LOW.
- A ratchet for a single-session skill = "every defect found in this task becomes a check on the bar; the bar never loses items during the run." Persisting it across sessions needs a file (memory/CLAUDE.md), which is a design question for the skill, not evidence. Conf=MEDIUM-LOW.
- Calibration against exemplars: for an agent, an exemplar of what "done well" looks like for this task type may help, but rubric-vs-exemplar evidence is mixed (see Gaps), so treat exemplars as optional, not core. Conf=LOW.
- The bar must be derived from the user's original goal and re-anchored each pass; otherwise it becomes a proxy (Goodhart). This matches the user's own Goal-Driven Execution rule. Conf=MEDIUM.
- "Independent judge" is the weakest link for a solo agent: Nemeth 2001 suggests role-played dissent underperforms authentic dissent. Use a fresh-context subagent with different instructions to approximate it. Conf=MEDIUM-LOW.

### Gaps
- No study found comparing "explicit written bar" vs "be careful" prompts for LLM agents or professionals (not searched under scope: LLM self-refinement belongs to another researcher).
- A search summary reported Lipnevich et al. (2014 undergraduates; 2023 follow-up with 206 9th and 10th graders) finding the rubric-only group improved most, ahead of exemplars and combined groups; I could not pin the exact source page, so this is unverified and should not be cited without checking.
- No evidence retrieved for calibration sessions beyond descriptive school-district protocols.
- Amazon Bar Raiser process (independent interviewer with veto) not researched, per scope.
- No empirical test of the "ratchet that never lowers" idea found.

---

## 4. Does the term "perfectize" (or "perfectionize") exist in the literature or among AI practitioners?

### Takeaway
No authoritative source for "perfectize" exists in what I could reach. "Perfectionize" is listed by Merriam-Webster as an archaic transitive verb. No AI prompt, tool, or skill using either word was found.

### Cited Findings
- A web search for "perfectize" with AI/prompt/agent terms returned only prompt-improvement tools (PromptPerfect, agent.ai Better Prompt Agent, Glean "enhance prompts") and no match for the word. — [search results include agent.ai docs](https://docs.agent.ai/user/premium-agents/better-prompt-agent.md), [Glean](https://docs.glean.com/agents/enhance-prompts) — **MEDIUM** (negative result from a search engine)
- Wiktionary has no "perfectize" page (HTTP 404 at the time of fetch). — [Wiktionary perfectize](https://en.wiktionary.org/wiki/perfectize) — **HIGH**
- Merriam-Webster has a page for "perfectionizes" listing the verb "perfectionize" as transitive and archaic, built from perfection + -ize (reported by search summary; direct fetch of the entry returned 403). — [Merriam-Webster](https://www.merriam-webster.com/dictionary/perfectionizes) — **MEDIUM**
- A second search for "perfectionize" OR "perfectize" with Claude/skill/agent terms found no usage in skills, agents, or prompts. "Perfectionate" and "perfectate" appear only on low-quality SEO pages with invented definitions. — [search results](https://www.merriam-webster.com/dictionary/perfectionizes) — **MEDIUM**

### Inferences
- "Perfectize" is a user coinage; treat it as "drive a finished result toward its best achievable form". The established vocabulary is "polish", "refine", "raise the bar", "kaizen", "satisfice". Using the coinage as a skill name risks poor discoverability; the SKILL.md description should carry synonyms. Conf=MEDIUM.
- The archaic word "perfectionize" matches "make perfect" while the literature argues against perfection as a target (Google: "no such thing as perfect code"; Simon), so the skill's framing should be "best achievable within a bar", not "perfect". Conf=MEDIUM.

### Gaps
- Searched only two queries for the term, plus two dictionary pages; did not check GitHub or skill directories directly (another researcher covers the skill catalog). Absence is "not found", not proof of nonexistence.
- OED/Wordnik not checked.

---

## 5. Synthesis: ranked list of the 6-8 mechanisms most worth encoding in a post-task AI skill

### Takeaway
Encode a written bar, an evidence-forcing pause-point checklist, a pre-mortem, a severity-gated stop rule with a pass cap, and a stop-the-line/ratchet step; add level-ordered passes and a fresh-context adversarial pass for high-stakes work. Rank is by (evidence strength x transfer to a solo agent), not by prestige.

### Cited Findings
Ranking table. Evidence column labels the strength of the underlying source; Transfer= is for a solo agent in one session.

| Rank | Mechanism | One-line justification | Evidence strength | Transfer= | Key sources |
|---|---|---|---|---|---|
| 1 | Written, binary bar derived from the original goal (Definition of Done, rubric) | Only mechanism with a pooled-effect estimate (rubrics g=0.45, k=21) and the precondition for any evaluator loop ("clear evaluation criteria") | MEDIUM-HIGH (human-education meta-analysis; DoD is practice) | HIGH | [Rubric meta-analysis](https://deustoteka.deusto.es/items/59022074-df96-4c6a-8c52-3aa513c0ae3e/full), [Scrum Guide](https://scrumguides.org/scrum-guide.html), [Anthropic](https://www.anthropic.com/engineering/building-effective-agents) |
| 2 | Pause-point checklist with evidence per item (DO-CONFIRM) | Large effects in WHO and ICU studies, but Ontario null shows it fails when not truly executed, so require evidence | MEDIUM-HIGH (mixed replication) | HIGH | [Haynes 2009](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:19144931%20AND%20SRC:MED&resultType=core&format=json), [Urbach summary](https://blogs.the-hospitalist.org/content/surgical-checklists-failed-improve-outcomes), [Pronovost](https://psnet.ahrq.gov/issue/intervention-decrease-catheter-related-bloodstream-infections-icu) |
| 3 | Severity-gated review with "better, not perfect" stop rule and Nit label | Directly addresses over-polishing; converts a stop rule into a threshold | MEDIUM (practice standard + decision research, no trial) | HIGH | [Google](https://google.github.io/eng-practices/review/reviewer/standard.html), [Simon summary](https://www.behavioraleconomics.com/resources/mini-encyclopedia-of-be/satisficing/), [Bellam and Curran](https://researchonline.lse.ac.uk/id/eprint/128910) |
| 4 | Pre-mortem / inversion on the finished result | Cheap, one-prompt, forces failure thinking before irreversible steps; matches user's pre-mortem rule | MEDIUM-LOW (technique documented, effect figure unverified) | HIGH | [Klein](https://www.gary-klein.com/premortem), [Munger notes](https://major.io/p/poor-charlies-almanac/) |
| 5 | Stop-the-line + root-cause + ratchet (jidoka/kaizen) | A found defect becomes a permanent check so the bar only goes up within the run | MEDIUM (Toyota definitions HIGH; effect data absent) | HIGH | [Toyota](https://global.toyota/en/company/vision-and-philosophy/production-system/), [Amazon LP](https://www.amazon.jobs/content/en/our-workplace/leadership-principles) |
| 6 | Stakes-scaled pass budget (cap passes, per-pass size cap, loop only when criteria are clear) | Controls cost; review yield falls with size/time and extra hours do not raise performance | MEDIUM-LOW | HIGH | [SmartBear](https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/), [Bellam and Curran](https://researchonline.lse.ac.uk/id/eprint/128910), [Anthropic](https://www.anthropic.com/engineering/building-effective-agents) |
| 7 | Multi-pass by level (structure, then line, then proofread) | Avoids polishing content that a structural fix would delete | LOW (no source retrieved beyond existence of JPL levels-of-edit) | HIGH | [JPL Levels of Edit catalogue](https://devfeature-collection.sl.nsw.gov.au/record/74VvRQ0oWGbg) |
| 8 | Independent adversarial pass in fresh context (red team / Braintrust / devil's advocate analogue) | Independence is what makes review work, and a solo agent has none; a fresh-context subagent is the nearest approximation | MEDIUM (DA beats consensus; authentic beats role-played) | LOW-MEDIUM alone, MEDIUM with a subagent | [Schweiger 1989](https://ideas.repec.org/a/bla/stratm/v10y1989i1p31-43.html), [Nemeth 2001](https://zendy.io/title/10.1002/ejsp.58), [Fast Company on Braintrust](https://www.fastcompany.com/3027135/inside-the-pixar-braintrust) |

Cross-cutting guard (not ranked): re-anchor every pass to the original user goal; a bar that has become the target stops measuring quality. — [Strathern 1997](https://www.Gwern.net/doc/statistics/decision/1997-strathern.pdf) — **MEDIUM**

### Inferences
- A sensible default order inside one run: (1) restate goal and write the bar, (2) execute checklist with evidence, (3) pre-mortem, (4) triage findings by severity and fix those at/above threshold (stop-the-line + add a check for each), (5) re-run the checklist only on changed parts, (6) stop under the rule set in Q2, (7) for high stakes only, run a fresh-context adversarial pass. Conf=MEDIUM-LOW (design inference).
- The strongest evidence-based argument against over-building the skill: strivings (high standard) help, concerns (open-ended self-critique) do not, and Google/Simon both recommend an explicit stop. The skill should be bar-bounded and pass-capped by design. Conf=MEDIUM.
- Items 7 and 8 are the weakest-evidence entries; keep them optional or stakes-gated.

### Gaps
- Coverage: about 40 tool calls; None of the following were verified from primary text: Klein 30% figure, Pronovost paper, Urbach paper, Buehler paper, Simon paper, Wilson and Schooler paper, JPL Levels of Edit content, Catmull's book.
- No evidence from AI-agent studies is included (assigned to other researchers); human-evidence transfer to LLM agents is inferred throughout.
- Ranking weights (evidence x transfer) are my judgment, not a validated scoring method.
