# Design: aio-gitlab-channel v0.1.0

**Date:** 2026-04-03
**Status:** Draft — pending user review
**Plugin:** `plugins/aio-gitlab-channel`

---

## Overview

Create a new channel-style Claude Code plugin, `aio-gitlab-channel`, that watches the latest GitLab pipeline for the repository in the current working directory by polling the `glab` CLI every 10 seconds. When a new pipeline appears or the latest pipeline changes status, the plugin pushes a `notifications/claude/channel` event into Claude Code so the AI immediately learns that deploy activity started, succeeded, failed, or was canceled.

The plugin is intentionally narrow:
- It watches **one GitLab project at a time** — the project inferred by `glab` from the current `cwd`
- It uses **`glab` CLI only** as the source of truth
- It focuses on **pipeline-level lifecycle events**, with short failed-job summaries only when useful
- It avoids noisy job-by-job notifications by default

---

## Goals

1. Let Claude know when deploy-related pipeline activity happens without being manually told
2. Surface the most important operational states: new pipeline, running, success, failed, canceled
3. Keep notifications concise and high-signal so they help reasoning instead of spamming context
4. Reuse the proven MCP channel pattern from `claude-room`, but replace WebSocket room messaging with local GitLab polling

---

## Non-Goals

- Multi-project monitoring from a single plugin process
- Direct GitLab REST API integration
- Room/broker communication, peer discovery, or encrypted transport
- Full job-level streaming updates for every job transition
- CI analytics, dashboards, or historical reporting

---

## Architecture

### File Structure

```text
plugins/aio-gitlab-channel/
├── .claude-plugin/
│   └── plugin.json
├── .mcp.json
├── package.json
├── README.md
├── server.ts
├── shared/
│   ├── gitlab.ts
│   ├── state.ts
│   ├── types.ts
│   └── format.ts
└── skills/
    └── aio-gitlab-channel/
        └── SKILL.md
```

### Components

#### 1. MCP stdio server (`server.ts`)
- Runs under Bun as the plugin entrypoint
- Declares the `claude/channel` capability
- Starts a polling loop on startup
- Uses `glab` via spawned subprocesses in the current `cwd`
- Emits `notifications/claude/channel` only when the watcher detects meaningful changes
- Exposes a small set of diagnostic tools for manual inspection

#### 2. GitLab polling module (`shared/gitlab.ts`)
Responsible for:
- Running `glab` commands
- Parsing structured command output into typed snapshot objects
- Optionally fetching failed-job details when a pipeline fails
- Normalizing missing/partial data into a stable internal model

#### 3. Watcher state module (`shared/state.ts`)
Responsible for:
- Holding the last observed pipeline snapshot
- Comparing current snapshot vs previous snapshot
- Detecting:
  - new latest pipeline
  - status transitions on the same pipeline
  - no-op states that should not notify
- Optionally persisting the last observed state to a small local state file so restart does not re-announce stale status

#### 4. Message formatter (`shared/format.ts`)
Responsible for:
- Converting detected events into short, AI-friendly channel messages
- Adding failure context only when available and small enough
- Keeping message shape predictable for downstream reasoning

#### 5. User-facing skill (`skills/aio-gitlab-channel/SKILL.md`)
Explains:
- what the plugin does
- prerequisites (`glab` installed + authenticated)
- how to install and run it
- what event types Claude will receive
- how to troubleshoot missing updates

---

## Runtime Model

### Startup flow

1. Claude Code starts the plugin via `.mcp.json`
2. `server.ts` connects over MCP stdio
3. The plugin gathers context:
   - `cwd`
   - git root if available
   - watcher configuration (default poll interval: 10s)
4. The plugin validates runtime prerequisites:
   - `glab` executable exists
   - current directory is a Git repo or a GitLab-linked project `glab` can resolve
5. The polling loop begins

### Poll loop

Every 10 seconds:
1. Query the latest pipeline for the current project
2. Parse a normalized `PipelineSnapshot`
3. Compare with the previous snapshot
4. If a new pipeline or a status change is detected:
   - build a notification message
   - if failed, try to enrich with a short failed-jobs summary
   - push `notifications/claude/channel`
5. Save the new snapshot as the current watcher state

### Event policy

The plugin emits a channel notification when:
- the latest pipeline ID changes
- the same latest pipeline changes `status`

The plugin stays silent when:
- polling succeeds but nothing changed
- job details changed without pipeline-level state changing
- failed-job enrichment fails after pipeline failure has already been detected

---

## Data Model

### `PipelineSnapshot`

```ts
interface PipelineSnapshot {
  pipelineId: number;
  status: string;
  ref: string;
  sha?: string;
  commitTitle?: string;
  webUrl?: string;
  updatedAt?: string;
}
```

### `PipelineFailureSummary`

```ts
interface PipelineFailureSummary {
  failedJobs: string[];
  summaryText?: string;
}
```

### `WatcherState`

```ts
interface WatcherState {
  lastPipeline?: PipelineSnapshot;
}
```

---

## `glab` Command Strategy

The plugin should prefer machine-readable output from `glab` where available.

### Primary latest pipeline lookup

Preferred shape:
- use a `glab` command that can list pipelines in JSON form for the current project
- request only fields needed by the watcher
- sort/select the newest pipeline deterministically

Required fields:
- pipeline ID
- status
- ref
- SHA
- updated timestamp
- URL if available

### Failure enrichment lookup

Only when the pipeline status becomes `failed`:
- query jobs for that pipeline
- extract failed jobs only
- keep the final summary short (for example, first 1-3 job names)

If the job query fails, the plugin still emits the pipeline failed event without enrichment.

---

## Channel Message Design

Messages should be concise, operational, and readable without extra formatting logic.

### Examples

New/running pipeline:
- `GitLab pipeline #456 for main started`
- `GitLab pipeline #456 for main is running`

Successful deploy:
- `GitLab pipeline #456 for main succeeded`
- `GitLab deploy succeeded for main in pipeline #456`

Failed deploy:
- `GitLab pipeline #456 for main failed`
- `GitLab pipeline #456 for main failed — failed jobs: deploy_prod, smoke_test`

Canceled:
- `GitLab pipeline #456 for main was canceled`

### Metadata policy

If MCP channel metadata is included, keep it lightweight and deterministic, for example:
- `pipeline_id`
- `status`
- `ref`
- `url`

The content itself should remain useful even if metadata is ignored.

---

## MCP Tools

The plugin is event-driven first, but it should expose a few low-friction tools for debugging.

### Proposed tools

#### `status`
Returns:
- watcher running/not running
- poll interval
- current cwd / detected project context
- last observed pipeline snapshot
- last poll timestamp

#### `check_now`
- Performs an immediate poll
- Returns whether anything changed
- Useful for debugging installation and auth

#### `last_pipeline`
- Returns the last normalized pipeline snapshot the watcher observed
- Useful when the user wants to inspect watcher state without waiting

No collaboration tools, room tools, or summary-setting tools are needed.

---

## State Persistence

### Recommended approach
Use both:
- in-memory state for normal operation
- a tiny persisted state file for restart resilience

Example persisted contents:
```json
{
  "lastPipeline": {
    "pipelineId": 456,
    "status": "success",
    "ref": "main",
    "updatedAt": "2026-04-03T09:10:00Z"
  }
}
```

### Why persist state
Without persistence, restarting Claude Code could re-announce the latest pipeline as if it were new. Persisting only the last observed pipeline avoids duplicate noise after restart while keeping implementation simple.

### Persistence scope
The state file should be local to the plugin runtime and treated as internal cache, not user-authored configuration.

---

## Configuration

### Defaults
- Poll interval: `10s`
- Watch scope: current project in `cwd`
- Notification scope: latest pipeline only

### Optional environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `AIO_GITLAB_CHANNEL_INTERVAL_MS` | `10000` | Poll interval override |
| `AIO_GITLAB_CHANNEL_LOG_LEVEL` | `info` | Runtime logging verbosity |

No project list or multi-project configuration is needed in v0.1.0.

---

## Error Handling

### `glab` missing
Behavior:
- log clear stderr error
- do not emit channel spam
- continue retrying on the normal interval or enter a soft degraded state

### `glab` not authenticated
Behavior:
- log auth guidance
- watcher remains alive
- no fake channel events

### Current repo not resolvable as a GitLab project
Behavior:
- log that project resolution failed for current `cwd`
- retry later in case repo context changes

### Poll command transient failure
Behavior:
- skip that cycle
- preserve previous state
- do not emit misleading status updates

### Failed-job enrichment failure
Behavior:
- still emit the failed pipeline event
- omit failed-job summary

### Malformed command output
Behavior:
- treat as poll failure for that cycle
- log the parse problem
- keep last valid state intact

---

## Testing Strategy

### Unit tests
Cover:
1. parse latest pipeline output into `PipelineSnapshot`
2. detect new pipeline vs unchanged pipeline
3. detect status transition on same pipeline
4. dedupe identical snapshots
5. format success/failure/canceled messages
6. trim failed-job summaries to a safe concise size

### Integration-style local tests
Simulate:
- `glab` command success with fixture output
- `glab` failure paths
- pipeline failure with and without failed jobs detail

### Manual smoke test
1. Open a GitLab-backed repo authenticated with `glab`
2. Run Claude Code with the plugin enabled
3. Trigger or wait for a new pipeline
4. Verify Claude receives the channel notification
5. Re-run without pipeline changes and verify no duplicate notification
6. Trigger a failed pipeline and verify the failure summary behavior

---

## README / Skill Documentation

The plugin documentation should cover:
- what problem the plugin solves
- prerequisites (`glab` installed and authenticated)
- install steps
- how channel notifications appear
- supported events
- troubleshooting (`glab auth status`, wrong cwd, no pipeline found, polling interval)

The skill should be discoverable for prompts like:
- `gitlab channel`
- `watch gitlab pipeline`
- `notify pipeline status`
- `deploy status from gitlab`
- `glab pipeline watcher`

---

## Versioning

Initial version:
- `plugin.json`: `0.1.0`

This is a new plugin, so no migration or compatibility layer is required.

---

## Marketplace Registration

Add a new marketplace entry:
- `name`: `aio-gitlab-channel`
- `source`: `./plugins/aio-gitlab-channel`
- `description`: concise summary of GitLab pipeline status channel notifications via `glab`
- `version`: `0.1.0`
- `author.name`: `aiocean`

---

## Success Criteria

1. In a GitLab repo with `glab` authenticated, the plugin detects a newly created latest pipeline within roughly one poll cycle
2. When the latest pipeline status changes, Claude receives exactly one new channel event for that transition
3. On pipeline failure, the notification still arrives even if failed-job enrichment cannot be fetched
4. Restarting Claude Code does not cause stale latest-pipeline events to replay repeatedly
5. The plugin is installable from this marketplace repo and passes marketplace validation
