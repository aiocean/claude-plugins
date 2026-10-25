# T-003: Build post-task perfectize skill
> Skill that takes finished, already-good work (code, prose, plans, analysis, UI) from good toward its best achievable form: freeze the core, remove first, one named gap per edit, accept-or-revert, a rising exemplar bar, a fixed-point report with leftovers. Plugin: `plugins/aio-perfectize/`. Design: `reports/Good to perfect AI refinement.md`; evidence: `research_notes/Good to perfect AI refinement/eval-artifacts.tar.gz`.
- **priority**: medium
- **effort**: L

## Criteria
- [ ] User confirms "perfect" = verified fixed point (no change survives checking against a rising bar, within a cycle cap, leftovers listed) and that the skill never claims absolute perfection
- [x] RED baseline, reduced scale: 3 scenarios x 3 reps x 3 tiers (27 control runs); control showed target failures in 14/27, concentrated in Haiku (8/9)
- [x] Ablation: one-sentence instruction scored 5/27 failing; the skill (3/26 when triggered) has not been shown to beat it
- [x] Plugin created with plugin.json, SKILL.md (trigger-only description), marketplace.json entry (v1.0.0), README row
- [x] `bash scripts/validate-marketplace.sh`: aio-perfectize passes; the repo-wide run fails only on aio-agent-threats (owner: its own session)
- [x] Decide: keep the skill, or replace its body with the one-sentence instruction — user chose to release the skill (2026-10-25)
- [x] Released: commit 46eea50 on origin/main; Validate Marketplace, Secret Scan and Cloudflare Pages deploy all succeeded; live pages return 200
- [ ] Not yet measured: whether the final work is better (needs a blind quality judge), the blind-judge step (never ran), P6 judge calibration, plan/analysis/UI scenarios
