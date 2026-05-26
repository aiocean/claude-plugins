# aio-code-review

**Google's engineering code-review discipline, applied to your PRs.**

Code review is one of the highest-leverage engineering activities — and one of the most commonly done wrong. Reviews that chase perfection block shipping. Reviews that rubber-stamp everything accumulate debt. Reviews that confuse personal preference with engineering judgment create conflict. This plugin distills Google's eng-practices guide into a working decision framework for both sides of the review: the reviewer who must decide when to approve, and the author who must navigate feedback without taking it personally.

## Why this plugin?

Most engineers learn code review by osmosis — watching whoever is senior on the team and inheriting their habits, good and bad. Google's eng-practices guide is one of the few publicly available, explicitly reasoned positions on how review should work. Its central principle is clarifying: **approve a CL once it definitely improves the overall code health of the system, even if the CL isn't perfect.** That single sentence resolves most review conflicts. Perfect is not the threshold. Better is.

The plugin surfaces this framework in both directions: what the reviewer should actually be evaluating (eight specific dimensions), how they should sequence a review to avoid wasted effort, and how an author should write CLs and respond to feedback without treating every comment as an attack.

## Install

```bash
/plugin install aio-code-review@aiocean-plugins
```

## Skills

### aio-code-review

The skill handles both reviewer and author roles.

**As a reviewer**, the skill covers:

- The LGTM threshold: improves code health, not perfection — and never approve a CL that worsens it
- The eight dimensions every review touches: design, functionality, complexity, tests, naming, comments, style, and documentation
- Review sequencing: broad view first, major design comments immediately, details last — so neither party wastes effort on a CL whose design will change
- Writing comments: kind, specific, explained, severity-labeled (`Nit:`, `Optional:`, `FYI:`) so authors can prioritize
- Handling pushback: how to distinguish "they're right and I should update my view" from "they're wrong and I need to re-explain"
- Speed: respond within one business day; LGTM-with-comments to unblock across time zones; ask large CLs to split before reviewing

**As an author**, the skill covers:

- CL description: imperative first line, problem + approach + tradeoffs in the body — not "Fix bug." or "Phase 1."
- Keeping CLs small: ~100 lines is usually fine; ~1000 is usually too large; refactorings go in separate CLs
- Splitting strategies: stacked CLs, split by file type, split by layer, split by feature
- Responding to comments: understand before reacting, fix the code not the review thread, disagree collaboratively not combatively

**For both**, the skill covers emergencies — what actually qualifies as one (small AND one of: major launch, production bug, legal issue, security hole) and what does not (soft deadlines, end of sprint, dev has worked on this for a long time).

Six deep-dive reference files cover each topic in full when a summary is not enough.

## The discipline underneath

Technical facts override opinions. The style guide is the authority on style, not the reviewer's preference. Software design is almost never purely subjective — there are engineering principles to reason from. When no other rule applies, prefer consistency with the surrounding code.

These are not new ideas. They become useful precisely because most teams do not state them explicitly, and review conflicts often dissolve once both parties agree on what the criteria actually are.

## Source

Content distilled from [github.com/google/eng-practices](https://github.com/google/eng-practices) (CC-BY 3.0).
