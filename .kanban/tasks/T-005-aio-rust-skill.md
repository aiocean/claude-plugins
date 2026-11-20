# T-005: Build the aio-rust skill
> Claude Code skill that makes agents write compiler-strict Rust: strict lints enforced by tool, ownership fixes without clone/Arc<Mutex> workarounds, verified crates, compile-clippy-test loop. Gaps from the 2026-11-20 deep-research run (no existing Rust skill does all four, none publishes an eval).
- **priority**: high
- **effort**: M

## Criteria
- [x] RED baseline recorded: evals/aio-rust/write-rust.json, without arm
- [x] SKILL.md + scripts address the failures seen in RED, not hypothetical ones
- [x] with arm beats without arm on the same suite; python-slug case does not trigger
- [x] Strict clippy passes on the with-arm work dirs
- [x] Registered in marketplace.json + README; validate-marketplace.sh passes

## Evidence (2026-11-20, sonnet, 3 reps/arm)
- Suite scores without → with: borrow-fix 80→100%, config-toml 83→100%, new-cli 71→100%, thread-count 50→100%; python-slug triggered 0/3.
- Gate (`aio-rust-lints.sh check`) on work dirs: baseline 9/12 fail (arithmetic_side_effects, expect_used on join), skill 12/12 pass; 0 escape patterns.
- Adversarial review (48 agents): 13 confirmed findings fixed; key one: forbid levels break #[tokio::main] / clap derive (E0453), so clippy lints are deny and check refuses #[allow] escapes.

## Not covered
- No eval case pressures the #[allow] escape or wrapping_/unwrap_or_default workarounds directly.
- Haiku and Opus arms not run.

## Round 2 (2026-11-20): escape pressure + reviewer-agent need
- escape.json (without → with): ledger-ci-red 46→82%, port-fixed-signature 83→100%. Every run that loaded the skill kept the lints and added no #[allow]. The one failure (ledger with-2) never loaded the skill and added `#[allow(clippy::unwrap_used, reason = "release hotfix")]`.
- review-gaps.json: the baseline passes map[&key], blocking std::fs in async and fsync handling 3/3. No rust-reviewer agent: there is no failure for it to fix.
- Open: the skill loaded in 4/6 runs of "make clippy pass" prompts (ledger 2/3, tier 2/3). A Stop hook running `check` would cover misses; not built (user did not pick it).
