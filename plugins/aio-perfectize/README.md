# aio-perfectize

Take finished, already-good work from good toward its best form without changing what the author fixed in place. "Perfect" here is a verified fixed point: no further change survives checking against the bar. The pass never calls the result perfect.

## What it does

- **Freezes the core first** — requirements, public interface, behavior pinned by tests (the tests themselves), facts and numbers, the author's voice, and scope, with a snapshot to revert to.
- **Removes before it adds** — dead code, duplication, hedges, orphan steps go first, because models add more than they remove when told to "improve".
- **One named gap per edit** — each change closes an observable gap (a failing check, a measurable size or speed, a requirement not yet shown) and is reverted if any earlier check regresses or the frozen core moves. Taste-only changes need a blind two-order comparison by a fresh-context subagent; a tie keeps the original.
- **Raises the bar against an exemplar** — each cycle compares the result with the user's, the project's, or a canonical example and turns the gaps into the next cycle's work. Stops after two empty cycles or three cycles.
- **Reports leftovers** — what was tried, accepted, rejected, which checks ran, and what could not be verified. "No change" is a valid result.

## Install

```bash
/plugin install aio-perfectize@aiocean-plugins
```

## Usage

Trigger phrases: "perfectize", "make it perfect", "take this from good to perfect", "final pass", "last 10%", "polish this", "raise the bar", "hoàn thiện lần cuối", "nâng chuẩn".

```
/aio-perfectize:aio-perfectize src/orders.ts
```

Runs after the work is approved: approving a change belongs to `aio-code-review`, AI-tell removal to `aio-anti-slop` (run it last on prose).

## Layout

```
skills/aio-perfectize/
└── SKILL.md   # freeze, remove, named-gap edits, accept-or-revert, raise the bar, report
```

## Evidence and limits

Measured with clean `claude -p` sessions and the prompt "Make X perfect.", on four scenarios (a code module with dead code, a tight no-op module, a voiced blog post, an analysis memo with planted arithmetic errors), 5 reps per cell, on Sonnet 5.5 and Haiku 5.5. The maintainer wrote the fixtures. A restraint failure is an edited existing test, a no-op file changed or grown, or a distinctive phrase lost.

**Restraint** (code, no-op and prose scenarios, 15 runs per tier):

| Arm | Sonnet | Haiku |
|---|---|---|
| No skill | 8 failing | 12 failing |
| One sentence: "Remove what is unnecessary first, change something only if you can show it is better, otherwise leave it unchanged." | 2 | 5 |
| This skill | 1 | 4 |

The skill fired in 40 of 40 runs with the current description (Sonnet fired in 2 of 13 earlier runs with the first wording). No run broke a held-out test or lost a fact.

**Quality**, judged blind with the original as reference, both presentation orders, a split verdict counting as a tie. The judge scored 6 of 6 on a calibration set of gross defects and preferred a plain memo over the same memo padded with filler, so a plain preference for length does not explain the results. The judge is a Claude model, so it is not independent of the generators.

- Skill against the one-sentence arm (Opus judge, prose and memo, both tiers): the skill won 17 of 20 pairs, tied 1, lost 2 (sign test p = 0.0007). It won 15 of the 17 where its output was longer; the additions were substantive, such as splitting the lift into traffic and conversion, and it kept the author's closing line where the sentence arm dropped it.
- Against the original on the tight voiced post (Sonnet judge): without the skill the revision lost or tied in every Sonnet run (2 losses, 3 ties) and lost 5 of 5 on Haiku; with the skill it never lost on Sonnet (2 wins, 3 ties) and lost 2 of 5 on Haiku. On the memo with planted errors every arm beat the original in 5 of 5, because unaided models also catch planted arithmetic.
- Cost: the skill uses about 1.4× the tokens of the unaided run and about 1.6× the one-sentence arm.

**Gaps**

- The blind-judge step for taste-level edits ran in 0 of 60 skill runs, so it is untested.
- The closing report block appeared in 20 of 20 Sonnet runs and 8 of 20 Haiku runs.
- On Haiku the skill changed the no-op module in 2 of 5 runs (the sentence arm: 0 of 5).
- No plan or UI scenario was run, and the Opus tier was measured only in an earlier 3-rep pass where it already showed few failures.
- n = 5 per cell: read one-rep differences as noise.
