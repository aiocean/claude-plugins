---
name: aio-kanban-monitor
description: |
  Watch the kanban board (`.kanban/board.md`) and auto-dispatch a sub-agent for
  each task in a chosen column whose content matches a free-text goal. Use when
  you want one Claude session to run "headless executor" while another session
  triages and writes new tasks into the board. Trigger phrases: "monitor kanban",
  "auto run tasks", "watch board", "auto dispatch tasks", "kanban worker",
  "kanban auto", "/aio-kanban-monitor".
when_to_use: kanban monitor, auto dispatch, watch board, auto run kanban, kanban worker, kanban auto, headless kanban, kanban executor, parallel kanban claude
effort: medium
argument-hint: "<status> <goal>   (e.g. Todo \"ship v2 release\")"
---

# Kanban Auto-Dispatch Monitor

Watches `.kanban/board.md` for changes. For each task in column `<status>` whose content (as judged by you, inline) contributes to free-text mission `<goal>`, spawns a sub-agent with a full self-contained prompt. Sub-agent owns the task lifecycle (Todo→Doing→Done) — this skill only orchestrates.

This skill REQUIRES the v3 kanban storage layout (index board + per-task files). See the `aio-kanban` skill.

---

## Arguments

- **`<status>`** (required): one of `Backlog`, `Todo`, `Doing`, `Done`, `Blocked`. Typically `Todo`.
- **`<goal>`** (required): free-text mission statement, e.g. `"ship v2 release"`, `"reduce p99 latency under 200ms"`. Used both to filter tasks (you judge relevance) and to anchor the spawned sub-agent's mission.

If either is missing, STOP and ask the user. Do NOT guess.

---

## Preconditions (check before starting the loop)

1. `.kanban/board.md` exists. If not → tell user to run `aio-kanban` init first. EXIT.
2. `.kanban/tasks/` directory exists. If not → board is v2, not v3. Tell user to migrate (manually re-init with `aio-kanban`, then re-create tasks as files). EXIT.
3. `fswatch` is installed (the monitor script will exit 3 if not — install via `brew install fswatch`). If missing → tell user how to install, EXIT.
4. `<status>` is one of the allowed columns. If not → STOP, ask user.
5. `<goal>` is non-empty. If not → STOP, ask user.

---

## Algorithm

```
state:
  dispatched: Set<TaskID>     # IDs we've already spawned this session
  judged_no:  Map<TaskID, hash-of-task-content>  # IDs we judged irrelevant; key on content hash so edits re-judge
  running:    TaskID | null   # the one currently-running sub-agent, if any
  shell_id:   string          # the fswatch background shell id

setup:
  1. Validate args + preconditions.
  2. Start the monitor as a background bash process:
       Bash(command="bash ${CLAUDE_PLUGIN_ROOT}/skills/aio-kanban-monitor/scripts/kanban-monitor.sh",
            run_in_background=true)
     Capture the returned shell_id.
  3. Tell the user: "Monitoring .kanban/board.md for tasks in <status> matching goal '<goal>'.
                    Press Ctrl+C or send /cancel to stop."

loop:
  4. Use Monitor tool on shell_id to receive the next stdout line (each line = one
     "board changed" notification; the first line is the synthetic "start").
  5. On each notification → run a PARSE PASS (see below).
  6. If a sub-agent is `running`, do NOT spawn another. Wait for it to finish
     (Claude Code auto-notifies on background-agent completion). When it
     completes, clear `running` and run another PARSE PASS immediately.
  7. Continue indefinitely until the user cancels.

cleanup (when user cancels):
  - Kill the background fswatch shell (KillShell with shell_id).
  - Print a summary: tasks dispatched this session, any still in Doing.
```

### PARSE PASS

```
1. Read .kanban/board.md.
2. Extract task entries under "## <status>" column.
   Each entry is a line like:  - [T-NNN](tasks/T-NNN-slug.md) Title — priority/effort
3. For each entry (in board order — top to bottom):
   a. If TaskID ∈ dispatched      → skip (already handled this session).
   b. If `running` is not null    → skip the entire rest of this pass (1-at-a-time).
   c. Read .kanban/tasks/T-NNN-*.md (resolve from the markdown link target).
   d. Compute a short content fingerprint (first 200 chars of the task body).
      If TaskID is in judged_no AND fingerprint matches the stored value
        → skip (already judged irrelevant; content unchanged).
      Otherwise → drop any stale judged_no entry for this ID.
   e. JUDGE INLINE (no sub-agent for the judge — you, the monitor, decide):
        Question to yourself: "Goal: <goal>. Task title: <title>.
                              Task description: <one-line description>.
                              Does this task directly contribute to the goal?"
        Answer YES or NO (with a one-line reason for the user log).
   f. If NO  → record judged_no[TaskID] = fingerprint. Continue to next entry.
   g. If YES → add TaskID to dispatched, set `running = TaskID`, SPAWN sub-agent
              (see "Spawning the sub-agent" below). Then STOP this pass — we are
              now 1-at-a-time busy.
4. End of pass.
```

### Spawning the sub-agent

Call the `Agent` tool with `run_in_background: true`. Use this prompt template VERBATIM, with `{…}` substituted:

````markdown
# Kanban Task: {T-NNN}

## MISSION
You are working toward: **{goal}**
This specific task contributes to that mission. Stay focused on it — do not expand scope.

## TASK SPEC
{Paste the full contents of .kanban/tasks/T-NNN-slug.md here.}

## KANBAN PROTOCOL (v3 — index + per-task files)

- Board (index only): `.kanban/board.md`
- Task file:          `.kanban/tasks/T-NNN-slug.md`
- Board line format:  `- [T-NNN](tasks/T-NNN-slug.md) Title — priority/effort`

### Lifecycle steps (MUST follow in order)

1. **Claim**: Move T-{NNN}'s line from `## {status}` to `## Doing` in `.kanban/board.md`.
   Update the `<!-- Updated: YYYY-MM-DD -->` timestamp.
2. **Execute**: Do the work. Make code changes, run tests, verify behavior. Follow the
   project's `CLAUDE.md` conventions (Claude Code auto-loads it for you).
3. **Track**: As each acceptance criterion in the task file passes, tick its checkbox.
4. **Finish — success path**: When ALL criteria are checked AND verified:
   - Move T-{NNN}'s board line from `## Doing` to `## Done`.
   - Append to the task file: `- **completed**: {today's date YYYY-MM-DD}`.
   - Update the board's `<!-- Updated: -->` timestamp.
5. **Finish — blocked path**: If you cannot complete the task:
   - Move T-{NNN}'s board line from `## Doing` to `## Blocked`.
   - Append to the task file: `- **blocked-by**: <one-line reason>`.
   - Do NOT mark Done. Update the board timestamp.

### Constraints

- One sub-agent owns this task; the monitor will NOT dispatch you in parallel with another.
- Edit `.kanban/board.md` atomically (read full file, write full file). Concurrent writers
  may exist (e.g. a triage session). Re-read before writing if too much time has passed.
- Do not invent new columns, IDs, or task files. Use only the existing IDs.

Report a one-line summary in your final message: success vs. blocked, plus what changed.
````

Pass `description: "kanban task {T-NNN}"` to the Agent tool.

---

## User-visible logging

Throughout the loop, keep the user informed concisely:

- On startup: `Monitoring '{status}' column for goal '{goal}'. Press Ctrl+C to stop.`
- On each parse pass: `[parse] {N} task(s) in {status}; dispatched={D}; running={R or 'none'}.`
- On each judge YES: `[dispatch] T-NNN: <title> — reason: <one-line>`
- On each judge NO: `[skip] T-NNN: <title> — not aligned with goal`
- On sub-agent completion: `[done] T-NNN: <final summary line>`
- On cancel: `[stop] dispatched={D} this session. Tasks still Doing: <list>.`

---

## Common pitfalls (do NOT do these)

- ❌ Spawning multiple sub-agents in parallel — this skill is 1-at-a-time on purpose.
- ❌ Editing `.kanban/board.md` yourself from the monitor session — the sub-agent owns lifecycle moves.
- ❌ Re-judging a task on every event when its content hasn't changed — use the `judged_no` cache.
- ❌ Spawning the judge as its own sub-agent — judge inline; only the executor is a sub-agent.
- ❌ Continuing past EXIT conditions silently — if preconditions fail, surface the error and stop.

---

## Two-session workflow (typical)

Run two Claude Code sessions side by side in the same repo:

- **Session A (this skill — executor)**: `/aio-kanban-monitor Todo "ship v2 release"`
  Sits and watches; auto-runs Todo tasks matching the goal.
- **Session B (triage — manual)**: user reads issues, GitHub PRs, Slack, whatever; uses the
  `aio-kanban` skill to write new task files and add their lines to `## Todo`.

Each write Session B makes to `.kanban/board.md` triggers fswatch → Session A re-parses → judges → dispatches if aligned. The board file is the sole coordination point.
