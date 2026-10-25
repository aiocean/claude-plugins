# T-004: Harden aio-perfectize on small models and untested scenarios
> Open gaps from the round-2 eval of aio-perfectize. Evidence: `research_notes/Good to perfect AI refinement/eval-round-2.md`.
- **priority**: low
- **effort**: M

## Criteria
- [ ] Closing report block appears on Haiku (8 of 20 runs today; Sonnet 20 of 20)
- [ ] Haiku leaves the no-op module unchanged (skill changed it in 2 of 5 runs; the one-sentence arm 0 of 5)
- [ ] The blind-judge step for taste-level edits runs when it should, or is removed (0 of 60 skill runs used it)
- [ ] A plan scenario and a UI scenario are added to the eval and the skill is measured on them
- [ ] A cross-family judge re-runs the head-to-head (codex and gemini lacked credentials on 2026-10-26)
- [ ] Any SKILL.md change is re-tested against the round-2 arms before release
