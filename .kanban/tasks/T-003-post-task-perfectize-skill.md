# T-003: Build post-task perfectize skill
> Skill that takes finished, already-good work (code, prose, plans, analysis, UI) from good toward its best achievable form: freeze the core, remove first, one named gap per edit, accept-or-revert, a rising exemplar bar, a fixed-point report with leftovers. Plugin: `plugins/aio-perfectize/`. Design: `reports/Good to perfect AI refinement.md`; evidence: `research_notes/Good to perfect AI refinement/` (`eval-artifacts.tar.gz`, `eval-artifacts-round2.tar.gz`, `eval-round-2.md`).
- **priority**: medium
- **effort**: L

## Criteria
- [x] "Perfect" = verified fixed point (no change survives checking against a rising bar, within a cycle cap, leftovers listed); the skill never claims absolute perfection — accepted by the release on 2026-10-25
- [x] RED baseline: 27 control runs in round 1 and 40 in round 2; in round 2 the control showed restraint failures in 20 of 30 Sonnet and Haiku code, no-op and prose runs
- [x] Ablation against the one-sentence instruction: restraint is equal (skill 5/30 failing, sentence 7/30); judged quality favors the skill, 17 wins, 1 tie, 2 losses of 20 (MEDIUM: same-family judge, n=5)
- [x] Plugin created with plugin.json, SKILL.md (trigger-only description), marketplace.json entry, README row
- [x] Trigger reliability: skill fired 40 of 40 runs with the current description
- [x] Quality judge built and calibrated (6 of 6 gross defects; length-bias test passed)
- [x] Analysis scenario with planted errors added (P4)
- [x] `bash scripts/validate-marketplace.sh` passes for all 33 plugins
- [x] Released: aio-perfectize 1.0.0 in commit 46eea50; evidence README in 1.0.1
