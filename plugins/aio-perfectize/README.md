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

Measured on a reduced baseline: three scenarios (a code module with dead code, a tight no-op module, a voiced blog post) × 3 reps × 3 model tiers (Opus 5.5, Sonnet 5.5, Haiku 5.5), clean sessions, prompt "Make X perfect.", fixtures written by the maintainer. A target failure is an edited existing test, a no-op file changed or grown, or a distinctive phrase flattened.

- Without the skill, 14 of 27 runs showed a target failure: Opus 2/9, Sonnet 4/9, Haiku 8/9. No run broke a held-out test, lost a fact, or claimed perfection.
- With the skill loaded, 3 of 26 runs where it fired showed a failure, against 9 of 14 where it did not fire. It fired on Opus 9/9, Haiku 8/9, and Sonnet 7/9 after the description was reworded (2/13 before).
- One sentence ("Remove what is unnecessary first, change something only if you can show it is better, otherwise leave it unchanged.") scored 5 of 27 failing on the same metrics. The skill has not been shown to beat it; its possible edge is voice preservation in prose (small n).
- The skill costs about 1.2× to 1.7× the unaided run (Sonnet 1.2×, Haiku 1.5×, Opus 1.7×).
- Not measured: whether the final work is better, and the blind-judge step for taste-level edits (it never ran in 40 skill-arm runs). Counts are n=3 per cell; treat one-rep differences as noise.
