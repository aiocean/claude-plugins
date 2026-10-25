# aio-perfectize eval, round 2

Round 1 (`eval-artifacts.tar.gz`) showed the failures the skill targets but left four things open: trigger reliability, whether the final work is better, the judge step, and scenarios with headroom. Round 2 closes the first two and adds an analysis scenario.

## Method

- Harness: `claude -p "Make <file> perfect."` in a clean temp directory, `--setting-sources project`, Sonnet 5.5 and Haiku 5.5, 5 reps per cell, 3 sessions at a time. Credential errors retry up to 3 times; an errored run is invalid, never counted.
- Scenarios: P1 code with dead code, P2 tight no-op module, P3 voiced blog post, P4 analysis memo with planted errors (week-2 conversion 5.5% should be 5.0%, "37%" should be 25%, an unsupported causal claim). P4's grader was validated against the original (all False) and a hand-fixed copy (all True).
- Arms: control (prompt only), one sentence appended to the prompt, skill with the current description (V1), skill with a stronger description (V2, Sonnet only). 140 runs, 0 invalid.
- Quality judge (P3, P4 only): blind pairwise, original as reference, both orders, a split verdict is a tie, identical files skip the call. Opus judged skill vs sentence (20 pairs, 40 calls); Sonnet judged each arm vs the original (60 pairs, 114 calls). Calibration: 6 of 6 correct on gross defects; plain preferred over 30-word filler by both judges, both orders.
- Not available: codex (401) and gemini (OAuth failure), so no cross-family judge.

## Results

Restraint failures, P1-P3, 15 runs per tier: control 8 (Sonnet) and 12 (Haiku); sentence 2 and 5; skill 1 and 4; skill V2 on Sonnet 1. No held-out test broke and no fact was lost in any arm.

Firing: skill V1 20/20 on Sonnet and 20/20 on Haiku; V2 20/20 on Sonnet. The first-wording run (V0) fired on Sonnet in 2 of 13.

P4 numbers fixed: control 5/5 and 5/5, sentence 4/5 (Sonnet) and 5/5, skill 5/5 and 5/5. Median memo length against the 124-word original: control 1.69x and 1.55x, sentence 1.03x and 0.98x, skill 1.21x and 1.11x.

Judged quality, skill (a) vs sentence (b), Opus: Sonnet P3 4/1/0, Sonnet P4 4/0/1, Haiku P3 4/0/1, Haiku P4 5/0/0; total 17 wins, 1 tie, 2 losses, sign test p = 0.0007. The skill's output was longer in 17 of 20 pairs and won 15 of them.

Judged against the original (Sonnet): P4 every arm 5/0/0. P3 control: Sonnet 0/3/2, Haiku 0/0/5; sentence: 0/3/2 and 0/2/3; skill: 2/3/0 and 1/2/2.

Skill behavior: blind-judge subagent spawned in 0 of 60 skill runs; closing report block present in 20/20 (Sonnet V1), 19/20 (Sonnet V2), 8/20 (Haiku); one "perfect" claim (Sonnet V2). On Haiku the skill changed the no-op module in 2 of 5 runs.

Cost: Sonnet control $1.56, sentence $1.35, skill $2.12; Haiku $0.15, $0.13, $0.22. Stored costs: agent runs $7.62, judging $4.53 (154 calls), calibration $0.46; about $13 with the unstored pilot, length-bias test and smoke run.

## Confidence

- Restraint result: MEDIUM-HIGH (programmatic grading, validated; n=5 per cell, two tiers).
- Quality result: MEDIUM. Same-family judge, a length confound only partly ruled out (filler test passed; substantive additions seen by reading one pair), and n=5.
- Trigger result: MEDIUM-HIGH (40/40 with V1 in the real harness).

## Reproduce

Extract `eval-artifacts-round2.tar.gz` into an empty directory and copy `pz-harness`, `pz-fixtures` to `/tmp` (paths are hardcoded), then `bash pz-harness/run_all.sh "A1s A2s A4s" "1 2 3 4 5" sonnet` and `python3 -I pz-harness/judge.py <spec.json> <out.jsonl>`. Transcripts (`out.json`) are not archived; `grade.json` carries tool counts, skill calls, costs and grader fields.
