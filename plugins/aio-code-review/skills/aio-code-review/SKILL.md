---
name: aio-code-review
description: Code-review playbook for both sides — reviewer (what to look for, when to approve, severity-labeled comments, handling pushback) and PR/CL author (writing CL descriptions, splitting changelists, responding to comments). Use when reviewing or authoring a PR/MR/CL/diff, deciding LGTM or LGTM threshold, authoring a merge request, assessing code health, handling a hotfix review, or replying to review feedback.
when_to_use: code review, review pr, review mr, lgtm, lgtm threshold, nit, approve pr, pr description, cl description, split pr, respond to review, pushback, hotfix, hotfix review, diff, diff review, changelist, CL, CL author, PR author, merge request, code health
argument-hint: "PR ref or role (reviewer | author)"
effort: medium
---

# Code Review

A **CL** (changelist) is one self-contained change under review — equivalent to a PR / MR. **LGTM** = "Looks Good to Me" (reviewer's approval). **Nit:** = optional polish, won't block.

Full principles and rationale: `references/01-overview.md`.

## Pick the role first

| User signal | Role | Start with |
|---|---|---|
| "review this PR / should I approve / check my diff" | **Reviewer** | the 8-point checklist below |
| "writing a PR description / split my change / respond to review comments" | **Author** | the author sections below |
| "is this an emergency / can we skip review" | both | the emergency section + `references/02-emergencies.md` |
| Unclear | ask once; default **Reviewer** | — |

## The Standard (the senior principle — memorize)

**Approve a CL once it definitely improves the overall code health of the system, even if the CL isn't perfect.**

There is no "perfect" code, only *better* code. Seek continuous improvement, not polish. **Never approve a CL that *worsens* code health** — only emergencies justify that.

Underlying principles:
- Technical facts and data overrule opinions and personal preferences.
- The style guide is the absolute authority on style.
- Software design is almost never pure preference — weigh on engineering principles, not vibes.
- When no other rule applies, prefer consistency with surrounding code.

Deep dive: `references/reviewer-01-standard.md`.

## Reviewer — every review touches 8 things

1. **Design** — does the change belong here? Does it fit the system?
2. **Functionality** — does it do what was intended, and is that good for users? Think about edge cases, concurrency, UI impact.
3. **Complexity** — could it be simpler? Watch for **over-engineering** (solving problems the dev *speculates* might appear later).
4. **Tests** — present in the same CL (unless emergency), correct, useful, not over-complex. Tests are code; they must be maintainable too.
5. **Naming** — long enough to communicate, short enough to read.
6. **Comments** — explain *why*, not *what*. Different from documentation (which describes purpose/usage).
7. **Style** — the style guide is the absolute authority. Personal preferences → prefix `Nit:`. Style-only changes belong in a separate CL.
8. **Documentation** — READMEs and generated reference docs updated when behavior changes.

Plus three discipline points: read **every line** assigned to you (with documented exceptions for multi-reviewer CLs); look at the broader **context** of the system; call out **good things**, not only defects — reinforcement teaches as much as critique.

Deep dive: `references/reviewer-02-what-to-look-for.md`.

## Reviewer — sequence (don't waste your own time)

1. **Broad view** — does the change make sense at all? If not, say so courteously and immediately; suggest what the author should have done instead. Don't waste their next-CL effort by staying silent.
2. **Main parts first** — find the file(s) carrying the major logic; review those first. Send any major design comments **immediately** — much of the rest may disappear once the design changes.
3. **The rest** — walk remaining files in a logical order (often tool order, or tests-then-code).

Deep dive: `references/reviewer-03-navigating-cl.md`.

## Reviewer — speed

- **Respond within one business day** when not in focused work. Team velocity > individual velocity.
- **Don't interrupt your own deep work.** Wait for a natural break — getting back into flow costs more than the author's wait.
- **LGTM-with-comments** to unblock when remaining items are trusted to the author or are clearly optional — especially across time zones.
- **Large CL → ask to split** before reviewing. If it truly can't be split, at least send broad design comments now so the author isn't blocked.

Deep dive: `references/reviewer-04-speed.md`.

## Reviewer — writing comments

- **Be kind.** Comment on the *code*, not the *developer*.
  - Bad: *"Why did **you** use threads here when there's obviously no benefit…"*
  - Good: *"The concurrency model adds complexity without a performance benefit that I can see. Best to keep this single-threaded."*
- **Explain why** — your intent, the principle, how the suggestion improves code health. Reasoning helps the author internalize, not just patch.
- **Label severity** so the author can prioritize:
  - `Nit:` — minor; technically you should fix it but it won't move the needle.
  - `Optional:` / `Consider:` — good idea, not required.
  - `FYI:` — future thought, not for this CL.
- **If the author has to explain code in the review tool, ask them to fix the code or add an in-code comment.** Review-tool explanations don't help future readers; the code does.

Deep dive: `references/reviewer-05-writing-comments.md`.

## Reviewer — handling pushback

- **First, ask if they're right.** They're often closer to the code than you are. If their point holds up on code-health grounds, drop the issue and tell them so.
- If they're not, explain again — acknowledge what they said, restate your reasoning, stay polite. Improving code health happens in small steps; a few rounds is fine.
- **Don't accept "I'll clean it up later."** It almost never happens — the dev moves on, the issue gets lost. Insist on cleanup *now*. If it truly must wait, file a bug, assign it to the author, and add a TODO referencing the bug.
- Persistent conflict → **escalate** (TL, maintainer, eng manager). Don't let the CL rot because two people can't agree.

Deep dive: `references/reviewer-06-handling-pushback.md`.

## Author — writing the description

Every description must answer **what** changed and **why**.

- **First line**: short, focused, **imperative** — *"Delete the FizzBuzz RPC and replace it with the new system"*, not *"Deleting…"*. This line stands alone in version-control history summaries.
- **Body**: the problem being solved, the chosen approach, known shortcomings, links to bugs / benchmarks / design docs. Inline enough context that future link-rot doesn't destroy the meaning.
- *"Fix bug."* / *"Phase 1."* / *"Add patch."* are **not** descriptions.
- **Re-read before submitting** — the CL may have changed significantly during review.

Deep dive: `references/author-01-cl-descriptions.md`.

## Author — keep CLs small

**One self-contained change.** ~100 lines is usually fine; ~1000 is usually too large; file count also matters (200 lines spread across 50 files is often too much). Small CLs review faster, review more thoroughly, introduce fewer bugs, are easier to merge and roll back, and waste less work when rejected.

Splitting strategies:
- **Stack** — write a small CL, send for review, immediately start the next based on it.
- **By files** — proto change separate from code change; code separate from config.
- **Horizontal** — split by stack layer (client / API / service / model) using shared stubs.
- **Vertical** — split by feature (multiplication / division) as parallel tracks.

Rules:
- **Refactorings go in separate CLs** from feature/bug changes.
- **Tests stay in the same CL** as the behavior change. Independent test additions/refactors can stand alone.
- **Don't break the build** between stacked CLs.

Deep dive: `references/author-02-small-cls.md`.

## Author — handling reviewer comments

- **Don't take it personally.** The goal is the codebase, not you. Never reply in anger — walk away if needed.
- **First question to yourself**: do I understand what the reviewer is asking? If not, ask for clarification before reacting.
- If the reviewer didn't understand the code → **fix the code** (or add an in-code comment). Don't explain only in the review tool — future readers won't see that.
- Disagree **collaboratively**, never combatively:
  - Bad: *"No, I'm not going to do that."*
  - Good: *"I went with X because of [pros/cons] with [these tradeoffs]. My understanding is Y would be worse because [reasons]. Are you suggesting Y better serves the original tradeoffs, that we weigh tradeoffs differently, or something else?"*

Deep dive: `references/author-03-handling-comments.md`.

## Emergencies (rare)

A real emergency is **small** AND one of: rescues a major launch, fixes a prod bug significantly affecting users, handles a pressing legal issue, closes a major security hole.

**Not** emergencies: ship-this-week-not-next, the dev has worked on this for ages, reviewers in another timezone, end-of-Friday, soft deadline, rolling back a build break.

In a real emergency, the reviewer prioritizes **speed and correctness-of-fix** above all else, and the CL jumps the queue. **After** the emergency, give the CL a thorough post-review.

A **hard deadline** = something disastrous happens if missed (contractual obligation, marketplace failure, once-a-year hardware ship window). Most deadlines are soft and don't justify cutting corners.

Deep dive: `references/02-emergencies.md`.

## Resolving conflicts (either role)

1. Try to reach consensus using the principles above as common ground.
2. Hard? Move to face-to-face or video — record the outcome as a CL comment for future readers.
3. Still stuck → **escalate** (TL, maintainer, eng manager). **Never let a CL sit because two people can't agree.**
