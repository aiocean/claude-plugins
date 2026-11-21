# T-006: Build the multi-day multi-agent skill
> A skill that lets an AI carry one large task across days and many sessions with subagents, result-first: a written definition of done, one step per wake-up, a judge that did not do the work, a record folder in the repo, and any waker (Temporal, Paseo schedule, Claude cloud routine, launchd + `claude -p`). Built from the 2026-11-21 deep research on long-running agents and from remit's mechanisms (remit itself is not changed).
- **priority**: high
- **effort**: L

## Criteria
- [x] Research finished: deep-research workflow report plus the four remit readings, verified findings kept with sources. Run `wf_0da9f673-55e`: 109 agents, 11 findings, 7 refuted. The findings are in §6 of the design doc.
- [x] Design doc approved by the user (2026-11-21): `docs/superpowers/specs/2026-11-21-multi-day-multi-agent-skill-design.md`
- [x] Plugin built: SKILL.md, references, record-folder script (`plugins/aio-longrun/`, version 1.0.1)
- [x] Record-folder script checked on the real toolchain: init, lock, append, status, and two overlapping wake-ups (20 rounds of two concurrent claims, exactly one winner each; a wake against a held lease answers `busy`)
- [x] One real run across at least two wake-ups ends Done, Waiting on X or Not done with a correct record (see "Real run" below)
- [x] Registered in marketplace.json and README; `bash scripts/validate-marketplace.sh` passes: 616 of 616 on the committed tree, and CI's Validate Marketplace passed on `1e38e0e`, the commit that published aio-longrun

## Decisions so far (user, 2026-11-21)
- "Work long" means days and many sessions, not one session.
- The loop lives in files in the repo and any waker drives it.
- Remit is source material only; it is not to be fixed.
- An approved contract authorizes pushing the run's own branch. Line 84 of `~/.claude/CLAUDE.md` was narrowed to match.

## Facts (2026-11-21)
Claude Code 2.1.329, `claude -p` with `--model haiku --output-format json --permission-mode acceptEdits --permission-prompts none`, run under `env -i HOME USER PATH` (a clean environment, as launchd gives).

1. **A plugin skill resolves by slash under `-p` and gets its arguments.** `/lrfact:lrfact tick <path>` with `--plugin-dir` returned `FACT-OK tick /tmp/lrfact.g9GdqP/rec`. Sign-in needs `USER`: `claude` finds its keychain login through it (`env -i HOME PATH claude auth status` reports `loggedIn: false`, and with `USER` it reports `true`). A LaunchAgent gets `USER` from launchd, and `.bin/env.sh` sets it when a waker's environment lacks it.
2. **Prompts are denied, not hung.** A Bash `touch` was denied in 18 s and the file was not created. `permission_denials` lists `Bash`, and the result says the call "needs approval and this session has no way to ask for it".
3. **Record access.**
   - A Write into `--add-dir <rec>/out` succeeded, and a Write to `<rec>/c.md` was denied.
   - A Read outside the working directories is denied by default ("outside the allowed working directories").
   - `--allowedTools "Read(/<abs path>/**)"` allows that Read (`RECORD-A`), and so does `--add-dir <rec>`, which also allows writes.
   - Permission paths are resolved (`/tmp` showed as `/private/tmp`).
4. **Subagents.** A foreground subagent's file existed when the process exited. A background subagent (`run_in_background: true`) had also finished by exit: the main session waited for its notification.
5. **Plugin agents.** A plugin agent loads under `-p` as `lrfact:lrreader`, the plugin-prefixed name. Its `tools:` list held: with no Bash, the `touch` never ran.
6. **Budget.** `--max-budget-usd 0.001` stopped the session with `is_error: true, subtype: error_max_budget_usd` after one turn costing $0.0097. The cap is checked between turns, so a session can overshoot it by one turn.
7. **`gh`.** cli/cli PR 15109: `gh pr checks --json name,bucket` gave buckets `pass` and `skipping`, and `gh pr view --json state,reviewDecision` gave `{"reviewDecision":"APPROVED","state":"MERGED"}`.
8. **Tick commands pass the prefix rule as written.** A heredoc into `handoff set` and a quoted multi-word `--what`
   pass `Bash(bun <R>/.bin/longrun.ts:*)` under `--permission-prompts none`. A chained `; echo "exit=$?"` is denied.
9. **Output into the record.** `git log --oneline > <R>/out/log.txt` passes under `Bash(git:*)` with `--add-dir <R>/out`.
10. **The preflight's status session.** It loads the skill only when the plugin is installed or `LONGRUN_PLUGIN_DIR` is set.
    With SKILL.md's verbatim status reply, 3 of 3 haiku preflights printed `<run-id>: Working (tick 0)`.

## Cloud routine (2026-11-21)
A one-off run of a disabled probe routine (claude-sonnet-5-5, connectors cleared, source this repo at `1e38e0e`)
with the prompt `/aio-longrun:aio-longrun status` answered: "`/aio-longrun:aio-longrun status` isn't installed as a
command in this session, so it didn't run." A routine's cloud session does not load plugins, and the routine API
stores neither `enabled_plugins` nor `extra_marketplaces`. Cloud routines cannot wake a run: `init` refuses
`waker: "cloud"`, and `references/wakers.md` says why.

## Real run (2026-11-21)
Two runs were armed on launchd (cadence 3 minutes), each after a preflight that printed only `ok` lines, with the
real claude on the default model. Ticks were capped by `limits.tickBudgetUsd` 3. Both contracts used record.md's
template allowlist (no `Bash(git:*)`), so every git and record command went through the tick's own rules.

**`2026-11-21-t8-green`, Done.** Criterion A was `hello.txt` contains hello. Criterion B was `ci-green.txt`
(git-ignored) written by "CI", a background job that wrote it after the first `sleep` wake.
- 14:22:14Z: tick 1 (holder `launch-91290-3ce47c83`). The orchestrator wrote `hello.txt` and committed `555c194`.
  - A fresh opus judge ruled A `met`.
  - Tick 1 added wait `w1` (`who: ci`, check `{"type":"file","path":"ci-green.txt","contains":"green"}`,
    blocking B).
  - It wrote a handoff, then `tick-end` answered `continue`.
  - It pushed `longrun/2026-11-21-t8-green` to the bare origin with the exact push rule and logged the effect.
  - 140 s, $1.071.
- 14:27:34Z: the wake answered `sleep`, and no session started.
- 14:30:34Z: `due` resolved `w1`. Tick 2 had a final judge re-run both checks at `555c194`: A and B `met`. Then
  `finish done`, 97 s, $0.782.
- Launch then disarmed the job: `launchctl print` exits non-zero, the plist is gone, and `notify.log` holds
  `2026-11-21-t8-green: Done`.

**`2026-11-21-t8-stall`, Not done.** The only criterion was `impossible.txt contains its own SHA-256`.
- Tick 1 judged it infeasible and ran `finish not-done` with the reason "Criterion A needs a SHA-256 fixed point
  … infeasible (~2^256 work) … Left: human can reopen with a feasible criterion …". 62 s, $0.492.
- Launch disarmed it, and `notify.log` holds the message.
- The nudge-to-stalled counters were not reached in a real session; Task 4's checks cover them.

**Guard rail.** A session ran with `tickArgv`'s flags and was asked to call Bash with `git push origin main`.
- `permission_denials` lists it: "Permission to use Bash with command git push origin main has been denied."
- origin's `main` stayed at `ef4de5e`.
- A session with the same prompt declined on the authorization line alone and never called the tool.

**Observed in the tick transcripts.**
- Every command ran in SKILL.md's order. One call was denied: tick 1 ran `longrun.ts wait <R> --help`, which no
  rule covers, then ran `wait add` correctly.
- Judges were dispatched with `model: "opus"` and `effort: "high"`. Their reports came back inline as the Agent
  tool result (`run_in_background: false`).
- launchd's `StartInterval` restarted when a run ended: the wakes came 3 and 6 minutes after tick 1 ended.
