# aio-longrun

Carry one large task to a verified result across days and many fresh Claude Code sessions.

You approve a contract once: what done means, as criteria that each have a check on the real surface, plus what
the run may do on its own. From then on, a waker (launchd, cron, a Paseo schedule or Temporal) starts one session
per wake, called a tick.

Each tick does one step:
- subagent workers do the work;
- a fresh judge, which did not do the work, runs each criterion's check itself;
- the tick writes a handoff for the next one.

A record folder in your repo carries the run between sessions, and a script owns the rules: when a tick is due,
the lease, stalls, crash loops, waits and deadlines. The run ends **Done**, **Waiting on** someone (a CI run, a
review, you), or **Not done**, with the reason.

## Install

```
/plugin marketplace add aiocean/claude-plugins
/plugin install aio-longrun@aiocean-plugins
```

It needs `bun`, `git` and Claude Code (checked with 2.1.329), plus `gh` for PR checks. The launchd waker is
macOS-only.

## An example run

```
> /aio-longrun:aio-longrun start the signup page sends a confirmation email, merged to main
```

Claude restates the goal and drafts the contract with you, then asks you to approve it. For example:

| Id | Criterion | Check | Pass |
|---|---|---|---|
| A | a new signup on staging gets the email within a minute (the user-visible result) | `curl https://staging.example.com/test-inbox/latest` | 200, subject "Confirm your email" |
| B | the PR's required checks pass | `gh pr checks <pr> --required` | every check passes |
| C | the PR is merged | `gh pr view <pr> --json state` | `MERGED` |

The effects: push `longrun/2026-11-21-signup-email` and its draft PR. The waker is launchd, every 30 minutes, with a
deadline of 7 days.

Once you approve, it creates the run's branch, worktree and record, then runs a preflight in launchd's bare
environment. When every line is `ok`, it arms the waker and works tick 1 in front of you. Later ticks run on their
own. Check on the run at any time:

```
$ R=.longrun/2026-11-21-signup-email
$ bun $R/.bin/longrun.ts status $R
2026-11-21-signup-email: Waiting on human (merge PR 42 at 3f9c2e1, since 2026-11-22T08:30:00.000Z, deadline 2026-11-25T08:30:00.000Z)
```

Merging is yours. The run prepared the exact command, and you run it from your own terminal:

```
$ bun $R/.bin/longrun.ts approve $R w3
```

- **Steer it:** `echo "reuse the mailer in src/mail.ts" >> $R/inbox.md`.
- **Stop it:** `echo stop >> $R/inbox.md`.
- **Disarm the waker by hand:** `bun $R/.bin/longrun.ts disarm $R`.

## Where things live

- `.longrun/<run-id>/` holds the run's record, kept out of git through `.git/info/exclude`. It contains the contract,
  the state, the journal, the handoff, the lessons, your inbox, the workers' reports, and the pinned scripts in
  `.bin/`.
- `.longrun/<run-id>/worktree/` is the run's git worktree, on branch `longrun/<run-id>`.
- `skills/aio-longrun/references/` has the record's fields (`record.md`), the brief templates (`briefs.md`) and each
  waker (`wakers.md`).

The guard rails stop accidents, not a determined agent. Protect your base branch, and keep deploy credentials out of
the environment ticks run in.
