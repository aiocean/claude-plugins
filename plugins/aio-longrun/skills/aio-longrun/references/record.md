# The record

A run's record is `.longrun/<run-id>/` in the main checkout. `init` adds `.longrun/` to `.git/info/exclude`, which
keeps the record out of git without changing a tracked file. It adds `.claude/worktrees/` too, where isolated
subagents' worktrees go, so they never count as uncommitted changes in the run's worktree. The run id is `<yyyy-mm-dd>-<slug>`, where the slug
uses a-z, 0-9 and `-`, up to 40 characters. Every command reads the record once, at its edge, and refuses a
malformed file, naming the line at fault.

## Files

| Path | Written by | Holds | Limit |
|---|---|---|---|
| `contract.md` | the human, after approving it | prose for people, plus one fenced `json` block, the only part the script reads | none |
| `state.json` | the script | status and reason, each criterion's status and latest verdict, waits, counters, the open tick, provider backoff | none |
| `journal.jsonl` | the script, append only | one event per line: `{at, tick, kind, data}` | a tick reads the last 30 |
| `handoff.md` | `handoff set` | the note one tick leaves for the next | 60 lines |
| `lessons.json` | `verdict … not_met`, `lesson add`, `lesson supersede` | `{id, kind, text, source, at, supersededBy?}`, kind `pitfall`, `preference` or `fact` | 300 characters each, 20 active |
| `inbox.md` | the human | free notes; a line that is exactly `stop` ends the run | emptied by each `inbox take` |
| `out/tick-<n>/` | workers | full reports; ticks can write here (`--add-dir`) | none |
| `worktree/` | `init` | the git worktree on branch `longrun/<run-id>`, cut from `base` | none |
| `.bin/` | `init` | the pinned scripts, plus `env.sh`: `BUN_BIN`, `CLAUDE_BIN`, `GH_BIN`, `LONGRUN_PLUGIN_DIR` when set, `USER` when the waker lacks one, `PATH` | none |
| `.lease/`, `.state-lock/` | the script | locks: a directory holding `lease.json {holder, expiresAt}` | lease 90 minutes |
| `wake.log` | `longrun-wake.sh`, launchd, cron | one line per wake start, and any failure before `launch` | none |

**Approval is a hash.**
- `state.json` stores the sha256 of the contract's `json` block. Editing prose outside the block changes nothing.
- Editing the block makes every tick command refuse until the human runs `bun <R>/.bin/longrun.ts reopen <R>` from
  their terminal.
- A changed contract re-opens every criterion as unmet.

`.bin/` is pinned at `init`, so a plugin update never changes a running run's scripts.

**Writes follow the lease.** A command that writes the record with a holder, from `--holder` or `LONGRUN_HOLDER`,
needs that holder to own the unexpired lease, so a tick whose lease lapsed and passed to another holder cannot
record over its successor. A write with no holder is the human's. It is refused only while a tick runs: the tick is
open and its holder's lease has not expired.

## The contract

The fenced block in `contract.md`, with the sample values from this plugin's own checks:

```json
{
  "format": 1,
  "goal": "The scratch repo has hello.txt saying hello and bye.txt saying bye.",
  "base": "main",
  "criteria": [
    {"id": "A", "text": "hello.txt contains hello", "check": "cat hello.txt", "pass": "prints hello", "userVisible": true},
    {"id": "B", "text": "bye.txt contains bye", "check": "cat bye.txt", "pass": "prints bye", "userVisible": false}
  ],
  "effects": {"pushRunBranch": true, "draftPr": false},
  "allowedTools": ["Agent", "Read", "Glob", "Grep", "Write", "Edit", "Bash(cat:*)"],
  "denied": ["Bash(git push origin main:*)", "Bash(git push --force:*)", "Bash(git push -f:*)", "Bash(gh pr merge:*)"],
  "checks": {},
  "waker": "launchd",
  "cadenceMinutes": 5,
  "deadline": "2026-11-22T09:00:00.000Z",
  "notify": ["osascript", "-e", "on run argv", "-e", "display notification (item 1 of argv) with title \"longrun\"", "-e", "end run", "{message}"],
  "approvedAt": "2026-11-21T09:00:00.000Z",
  "workflowScripts": false
}
```

| Field | Required | Meaning | Default |
|---|---|---|---|
| `format` | yes | the record format: `1` | |
| `goal` | yes | the result the human wants, one sentence; every worker brief quotes it | |
| `base` | yes | the branch the run starts from and merges from | |
| `criteria` | yes | a list of `{id, text, check, pass, userVisible}`. `id` uses letters, digits, `_` and `-`, up to 40, unique. At least one has `userVisible: true` | |
| `effects` | no | `{pushRunBranch, draftPr}`; `draftPr` needs `pushRunBranch` | both false |
| `allowedTools` | yes | the tick's allowlist: tool names and rules such as `Bash(<prefix>:*)` or `WebFetch(domain:<host>)` | |
| `denied` | no | rules passed as `--disallowedTools` | none |
| `checks` | no | named checks `{"<name>": {"argv": [...], "timeoutSeconds": 30}}`; the name uses a-z, 0-9 and `-` | none |
| `waker` | yes | `launchd`, `cron`, `paseo` or `temporal`; `init` refuses `cloud`: a cloud routine's session does not load plugins (`wakers.md`) | |
| `cadenceMinutes` | no | minutes between wakes | 30 |
| `deadline` | no | when the run ends Not done, listing what is left | `approvedAt` + 7 days |
| `notify` | yes | the argv run on Waiting on the human, Done and Not done; exactly one whole element is `{message}` | |
| `limits` | no | `stallTicks`, `maxNudges`, `deadTicks`, `leaseMinutes`, `tickBudgetUsd` | 2, 3, 3, 90, none |
| `approvedAt` | yes | when the human approved the contract | |
| `workflowScripts` | no | whether ticks may write Workflow scripts | false |

Unknown fields are refused.

**`allowedTools` usually needs more than the sample.**
- The project's test and build commands, for example `Bash(bun test:*)`.
- The programs the criteria's checks run, for example `Bash(gh pr checks:*)` or `Bash(curl:*)`.
- `WebFetch(domain:<host>)` for each host the reader or an `http` check reads.

**The tick adds its own rules,** pinned to this record and run:
- one rule per record command a tick runs, `Bash(bun <R>/.bin/longrun.ts <command> <R>:*)`, and `Read(/<R>/**)`;
  `init`, `launch`, `arm`, `disarm`, `reopen` and `approve` get none, and refuse to run under `LONGRUN_HOLDER`;
- the procedure's git commands: `git status`, `git log --oneline -10`, `git add`, `git commit -m`,
  `git rev-parse HEAD`, `git fetch origin <base>` and `git merge`;
- `git push origin longrun/<run-id>` when `pushRunBranch` is true;
- `gh pr create --draft`, `gh pr view`, `gh pr comment` and `gh pr checks` when `draftPr` is true;
- denies no contract can lift: `git -c`, `git -C`, `git --config-env`, `git --work-tree` and `git --git-dir` (they
  run a program or reach another repository), and `gh pr merge`;
- `--settings '{"worktree":{"baseRef":"head"}}'`, so an isolated subagent's worktree branches from the run branch.

**The notify default on macOS** is the argv in the sample: `osascript` passes `{message}` as `item 1 of argv`, so
no quoting can break it. With a PR, `["gh", "pr", "comment", "<pr>", "--body", "{message}"]` posts it there
instead.

## Waits

`bun <R>/.bin/longrun.ts wait add <R> --who <who> --what <text> --check <json> --blocks <ids> --deadline <iso|duration> [--on-expiry not_done|notify] [--command <json argv> --sha <sha>]`

- `--who` is `human`, `ci`, `review`, `deploy`, `time` or `provider`. A new human wait runs `notify`.
- `--blocks` names the criteria the wait holds back. The others stay workable.
- `--deadline` is an ISO time or a duration (`90s`, `30m`, `2h`, `7d`), never past the run's deadline.
- `--on-expiry` is `notify` (the default) or `not_done`, which ends the run.
- `--command` with `--sha` is a rung-3 action. It resolves only after the human's `approve` ran it with exit 0, at
  that full commit sha.
- Adding the same open wait again (same who, what and check) returns its id.

`due` runs each open wait's check itself: no shell, an argv, a timeout. An error or a timeout leaves a check
pending, and `status` shows why on the wait's line as `check error: <why>`, for example gh logged out. The `ci`,
`review` and `merged` checks run `GH_BIN` from `.bin/env.sh`, else `gh`.

A `file` check looks inside the worktree. A file that something outside the run writes there, such as a build or
CI artifact, must be ignored by git (`.gitignore`). Otherwise it counts as an uncommitted change, and `finish done`
refuses.

| Check | Shape | Resolved | Failed |
|---|---|---|---|
| `ci` | `{"type":"ci","pr":12}`, optional `"repo":"owner/name"` | every check passes or is skipped (`gh pr checks`) | one fails or is cancelled |
| `review` | `{"type":"review","pr":12}` | the review decision is APPROVED | CHANGES_REQUESTED |
| `merged` | `{"type":"merged","pr":12}` | the PR is MERGED | the PR is CLOSED |
| `file` | `{"type":"file","path":"docs/x.md","contains":"text"}`; `contains` optional, the path inside the worktree | the file exists, and contains the text | never |
| `http` | `{"type":"http","url":"https://x/health","status":200,"jsonField":"a.b","equals":"ok"}`; `jsonField` and `equals` optional | the status matches, and the field is present (and equal) | never |
| `time` | `{"type":"time","at":"2026-11-25T09:00:00Z"}` | the time has passed | never |
| `inbox` | `{"type":"inbox"}` | `inbox.md` has a note | never |
| `approval` | `{"type":"approval"}`, with `--command` and `--sha` | `approve` ran the command with exit 0 | never |
| `named` | `{"type":"named","name":"deploy-healthy"}` | the contract's argv exits 0 | it exits with anything but 0 or 10 (10 means not yet) |

## Events

`journal.jsonl` holds one event per line, `{at, tick, kind, data}`:

| Kind | Written when |
|---|---|
| `init` | the run is created |
| `tick_start` | a claim opens a tick |
| `tick_end` | a tick ends: its `outcome`, and `answer` (`continue`, `nudge`, `stalled` or `limit`) |
| `dead_tick` | a claim finds a tick that never ended |
| `dispatch` | `log dispatch`, one per worker |
| `effect` | `log effect`, one per push, PR or comment |
| `verdict` | a judge's ruling: `criterion`, `result`, `sha`, `dirty`, `evidence` or `why`, `judge` |
| `progress` | a step's own check passed |
| `wait_add` | a wait is added |
| `wait_settle` | a wait settles: `resolved`, `failed` or `expired` |
| `nudge` | the liveness rules fire: `why` |
| `lesson` | a lesson is added or superseded |
| `inbox` | `inbox take` moved the human's notes in |
| `approval` | `approve` ran a rung-3 command: `id`, `sha`, `exitCode` |
| `backoff` | a provider backoff: `until`, `step` |
| `finish` | the run ends: `status`, `reason` |
| `reopen` | the human reopened the run |
| `handoff` | the handoff was rewritten: its line count |
| `wake` | one launched wake: `answer` (`tick`, or the `due` or `claim` answer that ended it), and for a tick `exitCode`, `durationMs`, `isError`, `limit`, `costUsd`, `why`, `watchdog` |

## Liveness and finish

| Rule | Signal | Default | Action |
|---|---|---|---|
| No progress | ticks since a criterion was met, a step's check passed or a wait resolved | `stallTicks` 2 | a nudge: the next tick changes approach. After `maxNudges` 3 nudges, the run ends Not done (stalled) |
| Same failure | one criterion `not_met` for the same reason (digits, ids and times masked) in two ticks in a row | | a nudge at once |
| Dead tick | a tick started and never ended | `deadTicks` 3 in a row | the run ends Not done (crash loop) |
| Wait expiry | a wait's deadline passed | per wait | notify, or Not done |
| Run deadline | the contract's deadline passed | 7 days | Not done, listing what is left |

Usage limits and provider failures never count against the run. The launcher turns a "hit your … limit" refusal,
or a session that failed on the provider's side (no usage or credits left, a 429, an overload, a 5xx), into a
backoff: until the reset time the text names, or else 30 minutes, doubling up to 6 hours. The tick ends `limit`,
its outcome `provider: <the line>`, and `due` answers `backoff` until then.

`status` always prints the finish state first:
- `<run-id>: Done`;
- `<run-id>: Waiting on <who> (<what>, since <time>, deadline <time>)`, when every unmet criterion is blocked;
- `<run-id>: Waiting on provider (until <time>)`;
- `<run-id>: Not done (<reason>)`;
- `<run-id>: Working (tick <n>)`.

`finish done` refuses unless every criterion's latest verdict is `met`, was recorded at the run branch's current
commit, and no uncommitted change existed then or now.
