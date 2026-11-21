# Wakers

A waker starts one tick per wake. Each run has one waker, named in the contract's `waker` field.

- A local waker (launchd, cron, Temporal) runs `due` and `claim` before Claude starts, so a run that is waiting
  costs no session.
- An in-session waker (Paseo) starts the session first. The tick then runs `due` itself.

`finish` and every other command that ends a run print the disarm command for their waker. For launchd, they disarm
it themselves.

| Waker | Arm | Disarm | Status |
|---|---|---|---|
| launchd (macOS) | `bun <R>/.bin/longrun.ts arm <R>` | `bun <R>/.bin/longrun.ts disarm <R>` | checked on macOS with Claude Code 2.1.329 |
| cron | a crontab line that calls `longrun-wake.sh` | remove that line | not checked end to end |
| Paseo | `paseo schedule create --every …` | `paseo schedule delete <id>` | not checked end to end |
| Temporal | a workflow per run | `temporal workflow terminate` | not checked end to end |
| Claude cloud routine | not supported: a routine's session does not load plugins; `init` refuses `waker: "cloud"` | | checked 2026-11-21 with a one-off routine run |

## launchd

`bun <R>/.bin/longrun.ts arm <R>` writes and loads the LaunchAgent `dev.aiocean.longrun.<run-id>`, at
`~/Library/LaunchAgents/dev.aiocean.longrun.<run-id>.plist`:

- `ProgramArguments`: `/bin/bash <R>/.bin/longrun-wake.sh <R>`;
- `StartInterval`: `cadenceMinutes` × 60 seconds;
- `RunAtLoad`: one wake when it loads, and again after each login;
- `StandardOutPath` and `StandardErrorPath`: `<R>/wake.log`.

Each wake runs the same steps:

1. `longrun-wake.sh` sources `<R>/.bin/env.sh`, where `init` recorded the binaries it found and `USER`. launchd's
   own PATH is `/usr/bin:/bin:/usr/sbin:/sbin`, and `claude` finds its keychain login through `USER`. It writes a
   `wake start` line to `wake.log`, then runs `longrun launch`.
2. `launch` runs `due`. Any answer but `tick` ends the wake.
3. It claims the lease as `launch-<pid>-<8 hex>`, and puts that holder in the session's `LONGRUN_HOLDER`.
4. From the worktree, it starts:

   ```
   claude -p "/aio-longrun:aio-longrun tick <R>" --permission-mode acceptEdits --permission-prompts none \
     --output-format json --append-system-prompt "<authorization line>" --add-dir <R>/out \
     --settings '{"worktree":{"baseRef":"head"}}' \
     [--plugin-dir <LONGRUN_PLUGIN_DIR>] [--max-budget-usd <limits.tickBudgetUsd>] \
     --allowedTools <allowedTools…> <the tick's own rules…> "Read(/<R>/**)" \
     --disallowedTools <denied…> <the tick's fixed denies…>
   ```

   `references/record.md` lists the tick's own rules and fixed denies. The authorization line names the contract,
   the day the human approved it, the worktree, the branch, and whether pushing it and its draft PR are allowed. It
   ends "Nothing else that leaves this machine is authorized."
5. Every 60 seconds, a watchdog checks the lease. If the lease was released, taken by another holder or let expire,
   the watchdog stops the session: SIGTERM to its process group, then SIGKILL 10 seconds later.
6. When the session ends, `launch` reads its JSON result:
   - A "hit your … limit" refusal, or a session that failed on the provider's side (no usage or credits left, a
     429, an overload, a 5xx), becomes a backoff, until the reset time it names, or else 30 minutes doubling up to
     6 hours. The tick is not counted against the run.
   - It journals a `wake` event with the exit code, the duration and `costUsd`.
   - It releases the lease.
   - If the run has finished, it disarms the LaunchAgent. It waits until after the session because booting a job out
     kills its processes.

Check that the LaunchAgent is loaded: `launchctl print gui/$(id -u)/dev.aiocean.longrun.<run-id>`.

A failure before `launch` starts, for example a missing bun, goes to `wake.log`, and `status` shows it as
`last wake failed: …`.

`reopen` arms the LaunchAgent again.

## cron

Arm. On macOS, check first that a cron job can read the login keychain: the preflight runs in a bare environment,
not in cron's session.

```
(crontab -l 2>/dev/null; echo '*/<m> * * * * /bin/bash <R>/.bin/longrun-wake.sh <R> >> <R>/wake.log 2>&1') | crontab -
```

A cadence of 60 minutes or more becomes `0 */<hours> * * *`, with hours from 1 to 23.

Disarm:

```
crontab -l | grep -vF '<R>/.bin/longrun-wake.sh' | crontab -
```

Each wake is the same as under launchd, from step 1. The one difference: nothing disarms cron when the run ends. A
finished run's wakes only answer `finished`, and `finish` prints the disarm line.

## Paseo

Arm. This starts a new agent per tick, with the tick prompt and the authorization line:

```
paseo schedule create --every <m>m --name longrun-<run-id> --cwd <R>/worktree '/aio-longrun:aio-longrun tick <R>

<authorization line>'
```

Disarm: `paseo schedule delete <id>`, with the id that `paseo schedule ls` shows for `longrun-<run-id>`.

- A Paseo agent runs with the permission settings Paseo gives it, not the contract's allowlist. Before arming, check
  `paseo schedule create --help` for its `--mode` and `--provider` options, and never pick a bypass mode.
- The tick runs `due` and `claim` itself, with its own `tick-<hex>` holder. It passes that holder to every command
  that writes the record, and releases at the end.
- Usage limits are not read: a limited session fails, and the next wake tries again.

## Temporal

One workflow per run, with the id `longrun-<run-id>`, built with the `durable-tasks-with-temporal` skill where it is
installed:

1. **Activity `due`** runs `bun <R>/.bin/longrun.ts due <R>`, and maps the exit code to the answer: 0 `tick`,
   10 `sleep`, 11 `backoff`, 12 `finished`.
2. **On `tick`, Activity `tick`** runs `/bin/bash <R>/.bin/longrun-wake.sh <R>`. That is the launchd wake: `due`,
   claim, the session, the release. Give this Activity a start-to-close timeout longer than `limits.leaseMinutes`,
   and no retries: the record already handles a dead tick.
3. **A timer** of `cadenceMinutes` sets the pace. A signal, for example from a CI webhook, ticks at once.
4. The workflow ends when `due` answers `finished`.

Disarm: `temporal workflow terminate --workflow-id longrun-<run-id> --reason '<status>'`.

## Claude cloud routine

Not supported. Every tick runs this plugin's skill, and a routine's cloud session does not load plugins: a one-off
run of a routine whose prompt was `/aio-longrun:aio-longrun status`, on a fresh clone of this marketplace with
aio-longrun in it, answered that the command "isn't installed as a command in this session, so it didn't run"
(2026-11-21). The routine API accepts `enabled_plugins` and `extra_marketplaces` but stores neither. `init` refuses
`waker: "cloud"`.

## Session-only timers cannot carry a run

- `CronCreate` jobs live only in the Claude session that made them. Recurring ones expire after 7 days, and they
  fire only while the REPL is idle.
- `/loop` and `ScheduleWakeup` belong to one session too.

A run outlives every session, so a run's waker must live outside Claude Code: launchd, cron, a Paseo schedule or
Temporal.
