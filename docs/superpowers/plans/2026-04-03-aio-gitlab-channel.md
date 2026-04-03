# aio-gitlab-channel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new marketplace plugin that watches the latest GitLab pipeline for the current repository via `glab` and pushes Claude channel notifications when a new pipeline appears or its status changes.

**Architecture:** `aio-gitlab-channel` is a Bun MCP stdio server modeled after the channel pattern from `claude-room`, but without WebSockets or peer collaboration. A polling loop queries `glab` every 10 seconds, normalizes the latest pipeline into a typed snapshot, compares it with persisted watcher state, and emits `notifications/claude/channel` only for new pipelines or status transitions.

**Tech Stack:** Bun, TypeScript, MCP SDK, `glab` CLI, Markdown docs, marketplace validation shell script.

---

## File Structure

- `plugins/aio-gitlab-channel/.claude-plugin/plugin.json` — plugin manifest and version
- `plugins/aio-gitlab-channel/.mcp.json` — MCP server registration using `${CLAUDE_PLUGIN_ROOT}`
- `plugins/aio-gitlab-channel/package.json` — Bun package metadata and scripts
- `plugins/aio-gitlab-channel/README.md` — install, prerequisites, usage, troubleshooting
- `plugins/aio-gitlab-channel/server.ts` — MCP server entrypoint, tool handlers, polling lifecycle, channel dispatch
- `plugins/aio-gitlab-channel/shared/types.ts` — internal types for pipeline snapshot, failure summary, watcher state, and watch events
- `plugins/aio-gitlab-channel/shared/gitlab.ts` — `glab` command execution and parsing helpers
- `plugins/aio-gitlab-channel/shared/state.ts` — load/save/compare watcher state and dedupe logic
- `plugins/aio-gitlab-channel/shared/format.ts` — message formatting for pipeline events and diagnostics
- `plugins/aio-gitlab-channel/skills/aio-gitlab-channel/SKILL.md` — user-facing skill and runtime guidance
- `plugins/aio-gitlab-channel/__tests__/state.test.ts` — dedupe and transition detection tests
- `plugins/aio-gitlab-channel/__tests__/format.test.ts` — message formatting tests
- `plugins/aio-gitlab-channel/__tests__/gitlab.test.ts` — parser and failed-job summarization tests
- `.claude-plugin/marketplace.json` — marketplace registration entry
- `docs/index.html` — docs catalog entry for the new plugin

---

### Task 1: Scaffold the new plugin directory and manifest

**Files:**
- Create: `plugins/aio-gitlab-channel/.claude-plugin/plugin.json`
- Create: `plugins/aio-gitlab-channel/package.json`
- Create: `plugins/aio-gitlab-channel/.mcp.json`

- [ ] **Step 1: Create the plugin directory structure**

Run:
```bash
mkdir -p \
  "/Users/firegroup/projects/claude-plugins/plugins/aio-gitlab-channel/.claude-plugin" \
  "/Users/firegroup/projects/claude-plugins/plugins/aio-gitlab-channel/shared" \
  "/Users/firegroup/projects/claude-plugins/plugins/aio-gitlab-channel/skills/aio-gitlab-channel" \
  "/Users/firegroup/projects/claude-plugins/plugins/aio-gitlab-channel/__tests__"
```
Expected: directories created with no output.

- [ ] **Step 2: Write `plugin.json`**

Create `plugins/aio-gitlab-channel/.claude-plugin/plugin.json` with:

```json
{
  "name": "aio-gitlab-channel",
  "description": "GitLab pipeline status channel notifications via glab for the current repository.",
  "version": "0.1.0",
  "author": {
    "name": "aiocean"
  }
}
```

- [ ] **Step 3: Write `package.json`**

Create `plugins/aio-gitlab-channel/package.json` with:

```json
{
  "name": "aio-gitlab-channel",
  "version": "0.1.0",
  "description": "GitLab pipeline status channel notifications via glab for Claude Code",
  "type": "module",
  "private": true,
  "scripts": {
    "start": "bun install --no-summary && bun server.ts",
    "server": "bun server.ts",
    "test": "bun test"
  },
  "devDependencies": {
    "@types/bun": "latest"
  },
  "peerDependencies": {
    "typescript": "^5"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.27.1"
  }
}
```

- [ ] **Step 4: Write `.mcp.json`**

Create `plugins/aio-gitlab-channel/.mcp.json` with:

```json
{
  "mcpServers": {
    "aio-gitlab-channel": {
      "command": "bun",
      "args": ["run", "--cwd", "${CLAUDE_PLUGIN_ROOT}", "--silent", "start"]
    }
  }
}
```

- [ ] **Step 5: Verify the manifest files exist and parse**

Run:
```bash
python3 - <<'PY'
import json
from pathlib import Path
paths = [
    Path('/Users/firegroup/projects/claude-plugins/plugins/aio-gitlab-channel/.claude-plugin/plugin.json'),
    Path('/Users/firegroup/projects/claude-plugins/plugins/aio-gitlab-channel/package.json'),
    Path('/Users/firegroup/projects/claude-plugins/plugins/aio-gitlab-channel/.mcp.json'),
]
for path in paths:
    data = json.loads(path.read_text())
    print(path.name, 'ok', sorted(data.keys()))
PY
```
Expected:
- `plugin.json ok ...`
- `package.json ok ...`
- `.mcp.json ok ...`

- [ ] **Step 6: Commit**

```bash
git -C "/Users/firegroup/projects/claude-plugins" add \
  plugins/aio-gitlab-channel/.claude-plugin/plugin.json \
  plugins/aio-gitlab-channel/package.json \
  plugins/aio-gitlab-channel/.mcp.json
git -C "/Users/firegroup/projects/claude-plugins" commit -m "feat: scaffold aio-gitlab-channel plugin"
```

---

### Task 2: Define internal types and watcher state logic

**Files:**
- Create: `plugins/aio-gitlab-channel/shared/types.ts`
- Create: `plugins/aio-gitlab-channel/shared/state.ts`
- Test: `plugins/aio-gitlab-channel/__tests__/state.test.ts`

- [ ] **Step 1: Write the failing state tests**

Create `plugins/aio-gitlab-channel/__tests__/state.test.ts` with:

```ts
import { describe, expect, test } from "bun:test";
import type { PipelineSnapshot, WatcherState } from "../shared/types";
import { detectPipelineEvent } from "../shared/state";

const base = (overrides: Partial<PipelineSnapshot> = {}): PipelineSnapshot => ({
  pipelineId: 100,
  status: "running",
  ref: "main",
  sha: "abc123",
  updatedAt: "2026-04-03T10:00:00Z",
  ...overrides,
});

describe("detectPipelineEvent", () => {
  test("emits new_pipeline when there is no previous snapshot", () => {
    const result = detectPipelineEvent({}, base());
    expect(result?.type).toBe("new_pipeline");
    expect(result?.snapshot.pipelineId).toBe(100);
  });

  test("emits status_changed when the same pipeline changes status", () => {
    const previous: WatcherState = { lastPipeline: base({ status: "running" }) };
    const result = detectPipelineEvent(previous, base({ status: "success" }));
    expect(result?.type).toBe("status_changed");
    expect(result?.previousStatus).toBe("running");
    expect(result?.snapshot.status).toBe("success");
  });

  test("emits new_pipeline when the latest pipeline id changes", () => {
    const previous: WatcherState = { lastPipeline: base({ pipelineId: 100, status: "failed" }) };
    const result = detectPipelineEvent(previous, base({ pipelineId: 101, status: "running" }));
    expect(result?.type).toBe("new_pipeline");
    expect(result?.snapshot.pipelineId).toBe(101);
  });

  test("returns null when the pipeline id and status are unchanged", () => {
    const previous: WatcherState = { lastPipeline: base() };
    const result = detectPipelineEvent(previous, base());
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to confirm failure**

Run:
```bash
cd "/Users/firegroup/projects/claude-plugins/plugins/aio-gitlab-channel" && bun test __tests__/state.test.ts
```
Expected: FAIL with missing module/function errors for `../shared/state` and `../shared/types`.

- [ ] **Step 3: Write `shared/types.ts`**

Create `plugins/aio-gitlab-channel/shared/types.ts` with:

```ts
export interface PipelineSnapshot {
  pipelineId: number;
  status: string;
  ref: string;
  sha?: string;
  commitTitle?: string;
  webUrl?: string;
  updatedAt?: string;
}

export interface PipelineFailureSummary {
  failedJobs: string[];
  summaryText?: string;
}

export interface WatcherState {
  lastPipeline?: PipelineSnapshot;
  lastPollAt?: string;
}

export interface PipelineEvent {
  type: "new_pipeline" | "status_changed";
  snapshot: PipelineSnapshot;
  previousStatus?: string;
}
```

- [ ] **Step 4: Write `shared/state.ts`**

Create `plugins/aio-gitlab-channel/shared/state.ts` with:

```ts
import type { PipelineEvent, PipelineSnapshot, WatcherState } from "./types";

export function detectPipelineEvent(
  state: WatcherState,
  snapshot: PipelineSnapshot,
): PipelineEvent | null {
  const previous = state.lastPipeline;

  if (!previous) {
    return { type: "new_pipeline", snapshot };
  }

  if (previous.pipelineId !== snapshot.pipelineId) {
    return { type: "new_pipeline", snapshot };
  }

  if (previous.status !== snapshot.status) {
    return {
      type: "status_changed",
      snapshot,
      previousStatus: previous.status,
    };
  }

  return null;
}

export function nextWatcherState(
  previous: WatcherState,
  snapshot: PipelineSnapshot,
  polledAt = new Date().toISOString(),
): WatcherState {
  return {
    ...previous,
    lastPipeline: snapshot,
    lastPollAt: polledAt,
  };
}
```

- [ ] **Step 5: Re-run the state test**

Run:
```bash
cd "/Users/firegroup/projects/claude-plugins/plugins/aio-gitlab-channel" && bun test __tests__/state.test.ts
```
Expected:
- 4 tests PASS
- output contains `4 pass`

- [ ] **Step 6: Commit**

```bash
git -C "/Users/firegroup/projects/claude-plugins" add \
  plugins/aio-gitlab-channel/shared/types.ts \
  plugins/aio-gitlab-channel/shared/state.ts \
  plugins/aio-gitlab-channel/__tests__/state.test.ts
git -C "/Users/firegroup/projects/claude-plugins" commit -m "feat: add aio-gitlab-channel watcher state logic"
```

---

### Task 3: Parse `glab` output and failure summaries

**Files:**
- Create: `plugins/aio-gitlab-channel/shared/gitlab.ts`
- Test: `plugins/aio-gitlab-channel/__tests__/gitlab.test.ts`

- [ ] **Step 1: Write the failing parser tests**

Create `plugins/aio-gitlab-channel/__tests__/gitlab.test.ts` with:

```ts
import { describe, expect, test } from "bun:test";
import { parseLatestPipeline, summarizeFailedJobs } from "../shared/gitlab";

const listJson = JSON.stringify([
  {
    id: 456,
    status: "success",
    ref: "main",
    sha: "deadbeef",
    updated_at: "2026-04-03T09:10:00Z",
    web_url: "https://gitlab.example.com/group/project/-/pipelines/456",
  },
]);

const jobsJson = JSON.stringify([
  { name: "lint", status: "success" },
  { name: "deploy_prod", status: "failed" },
  { name: "smoke_test", status: "failed" },
  { name: "cleanup", status: "failed" },
  { name: "notify", status: "failed" },
]);

describe("parseLatestPipeline", () => {
  test("returns the first pipeline as a normalized snapshot", () => {
    const snapshot = parseLatestPipeline(listJson);
    expect(snapshot).toEqual({
      pipelineId: 456,
      status: "success",
      ref: "main",
      sha: "deadbeef",
      updatedAt: "2026-04-03T09:10:00Z",
      webUrl: "https://gitlab.example.com/group/project/-/pipelines/456",
    });
  });

  test("throws when no pipelines are returned", () => {
    expect(() => parseLatestPipeline("[]")).toThrow("No pipelines found");
  });
});

describe("summarizeFailedJobs", () => {
  test("returns at most three failed jobs and summary text", () => {
    const summary = summarizeFailedJobs(jobsJson);
    expect(summary.failedJobs).toEqual(["deploy_prod", "smoke_test", "cleanup"]);
    expect(summary.summaryText).toBe("failed jobs: deploy_prod, smoke_test, cleanup");
  });

  test("returns an empty summary when no jobs failed", () => {
    const summary = summarizeFailedJobs(JSON.stringify([{ name: "lint", status: "success" }]));
    expect(summary.failedJobs).toEqual([]);
    expect(summary.summaryText).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the parser tests to confirm failure**

Run:
```bash
cd "/Users/firegroup/projects/claude-plugins/plugins/aio-gitlab-channel" && bun test __tests__/gitlab.test.ts
```
Expected: FAIL because `../shared/gitlab` does not exist yet.

- [ ] **Step 3: Write `shared/gitlab.ts`**

Create `plugins/aio-gitlab-channel/shared/gitlab.ts` with:

```ts
import type { PipelineFailureSummary, PipelineSnapshot } from "./types";

interface RawPipeline {
  id: number;
  status: string;
  ref: string;
  sha?: string;
  updated_at?: string;
  web_url?: string;
}

interface RawJob {
  name: string;
  status: string;
}

export function parseLatestPipeline(raw: string): PipelineSnapshot {
  const pipelines = JSON.parse(raw) as RawPipeline[];
  const latest = pipelines[0];

  if (!latest) {
    throw new Error("No pipelines found");
  }

  return {
    pipelineId: latest.id,
    status: latest.status,
    ref: latest.ref,
    sha: latest.sha,
    updatedAt: latest.updated_at,
    webUrl: latest.web_url,
  };
}

export function summarizeFailedJobs(raw: string): PipelineFailureSummary {
  const jobs = JSON.parse(raw) as RawJob[];
  const failedJobs = jobs
    .filter((job) => job.status === "failed")
    .map((job) => job.name)
    .slice(0, 3);

  return {
    failedJobs,
    summaryText: failedJobs.length > 0 ? `failed jobs: ${failedJobs.join(", ")}` : undefined,
  };
}

export async function runGlab(args: string[], cwd: string): Promise<string> {
  const proc = Bun.spawn(["glab", ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(stderr.trim() || `glab exited with code ${exitCode}`);
  }

  return stdout;
}

export async function fetchLatestPipeline(cwd: string): Promise<PipelineSnapshot> {
  const output = await runGlab(
    [
      "ci",
      "list",
      "--per-page",
      "1",
      "--page",
      "1",
      "--output",
      "json",
    ],
    cwd,
  );

  return parseLatestPipeline(output);
}

export async function fetchFailureSummary(
  cwd: string,
  pipelineId: number,
): Promise<PipelineFailureSummary> {
  const output = await runGlab(
    [
      "ci",
      "view",
      String(pipelineId),
      "--jobs",
      "--output",
      "json",
    ],
    cwd,
  );

  return summarizeFailedJobs(output);
}
```

- [ ] **Step 4: Re-run the parser tests**

Run:
```bash
cd "/Users/firegroup/projects/claude-plugins/plugins/aio-gitlab-channel" && bun test __tests__/gitlab.test.ts
```
Expected:
- 4 tests PASS
- output contains `4 pass`

- [ ] **Step 5: Commit**

```bash
git -C "/Users/firegroup/projects/claude-plugins" add \
  plugins/aio-gitlab-channel/shared/gitlab.ts \
  plugins/aio-gitlab-channel/__tests__/gitlab.test.ts
git -C "/Users/firegroup/projects/claude-plugins" commit -m "feat: add aio-gitlab-channel glab parsing and failure summaries"
```

---

### Task 4: Format channel messages for pipeline events

**Files:**
- Create: `plugins/aio-gitlab-channel/shared/format.ts`
- Test: `plugins/aio-gitlab-channel/__tests__/format.test.ts`

- [ ] **Step 1: Write the failing format tests**

Create `plugins/aio-gitlab-channel/__tests__/format.test.ts` with:

```ts
import { describe, expect, test } from "bun:test";
import type { PipelineFailureSummary, PipelineSnapshot } from "../shared/types";
import { formatPipelineEventMessage } from "../shared/format";

const snapshot: PipelineSnapshot = {
  pipelineId: 456,
  status: "running",
  ref: "main",
  webUrl: "https://gitlab.example.com/group/project/-/pipelines/456",
};

const failedSummary: PipelineFailureSummary = {
  failedJobs: ["deploy_prod", "smoke_test"],
  summaryText: "failed jobs: deploy_prod, smoke_test",
};

describe("formatPipelineEventMessage", () => {
  test("formats new pipeline messages", () => {
    const message = formatPipelineEventMessage("new_pipeline", snapshot);
    expect(message).toBe("GitLab pipeline #456 for main started");
  });

  test("formats success messages", () => {
    const message = formatPipelineEventMessage("status_changed", { ...snapshot, status: "success" });
    expect(message).toBe("GitLab pipeline #456 for main succeeded");
  });

  test("formats failed messages with summary", () => {
    const message = formatPipelineEventMessage(
      "status_changed",
      { ...snapshot, status: "failed" },
      failedSummary,
    );
    expect(message).toBe("GitLab pipeline #456 for main failed — failed jobs: deploy_prod, smoke_test");
  });

  test("formats canceled messages", () => {
    const message = formatPipelineEventMessage("status_changed", { ...snapshot, status: "canceled" });
    expect(message).toBe("GitLab pipeline #456 for main was canceled");
  });
});
```

- [ ] **Step 2: Run the format tests to confirm failure**

Run:
```bash
cd "/Users/firegroup/projects/claude-plugins/plugins/aio-gitlab-channel" && bun test __tests__/format.test.ts
```
Expected: FAIL because `../shared/format` does not exist yet.

- [ ] **Step 3: Write `shared/format.ts`**

Create `plugins/aio-gitlab-channel/shared/format.ts` with:

```ts
import type { PipelineFailureSummary, PipelineSnapshot } from "./types";

export function formatPipelineEventMessage(
  eventType: "new_pipeline" | "status_changed",
  snapshot: PipelineSnapshot,
  failureSummary?: PipelineFailureSummary,
): string {
  if (eventType === "new_pipeline") {
    return `GitLab pipeline #${snapshot.pipelineId} for ${snapshot.ref} started`;
  }

  switch (snapshot.status) {
    case "success":
      return `GitLab pipeline #${snapshot.pipelineId} for ${snapshot.ref} succeeded`;
    case "failed": {
      const suffix = failureSummary?.summaryText ? ` — ${failureSummary.summaryText}` : "";
      return `GitLab pipeline #${snapshot.pipelineId} for ${snapshot.ref} failed${suffix}`;
    }
    case "canceled":
      return `GitLab pipeline #${snapshot.pipelineId} for ${snapshot.ref} was canceled`;
    case "running":
      return `GitLab pipeline #${snapshot.pipelineId} for ${snapshot.ref} is running`;
    default:
      return `GitLab pipeline #${snapshot.pipelineId} for ${snapshot.ref} is ${snapshot.status}`;
  }
}
```

- [ ] **Step 4: Re-run the format tests**

Run:
```bash
cd "/Users/firegroup/projects/claude-plugins/plugins/aio-gitlab-channel" && bun test __tests__/format.test.ts
```
Expected:
- 4 tests PASS
- output contains `4 pass`

- [ ] **Step 5: Commit**

```bash
git -C "/Users/firegroup/projects/claude-plugins" add \
  plugins/aio-gitlab-channel/shared/format.ts \
  plugins/aio-gitlab-channel/__tests__/format.test.ts
git -C "/Users/firegroup/projects/claude-plugins" commit -m "feat: add aio-gitlab-channel message formatter"
```

---

### Task 5: Implement state persistence helpers

**Files:**
- Modify: `plugins/aio-gitlab-channel/shared/state.ts`

- [ ] **Step 1: Extend `shared/state.ts` with file persistence**

Replace `plugins/aio-gitlab-channel/shared/state.ts` with:

```ts
import type { PipelineEvent, PipelineSnapshot, WatcherState } from "./types";

export function detectPipelineEvent(
  state: WatcherState,
  snapshot: PipelineSnapshot,
): PipelineEvent | null {
  const previous = state.lastPipeline;

  if (!previous) {
    return { type: "new_pipeline", snapshot };
  }

  if (previous.pipelineId !== snapshot.pipelineId) {
    return { type: "new_pipeline", snapshot };
  }

  if (previous.status !== snapshot.status) {
    return {
      type: "status_changed",
      snapshot,
      previousStatus: previous.status,
    };
  }

  return null;
}

export function nextWatcherState(
  previous: WatcherState,
  snapshot: PipelineSnapshot,
  polledAt = new Date().toISOString(),
): WatcherState {
  return {
    ...previous,
    lastPipeline: snapshot,
    lastPollAt: polledAt,
  };
}

export async function loadWatcherState(path: string): Promise<WatcherState> {
  const file = Bun.file(path);

  if (!(await file.exists())) {
    return {};
  }

  return (await file.json()) as WatcherState;
}

export async function saveWatcherState(path: string, state: WatcherState): Promise<void> {
  await Bun.write(path, JSON.stringify(state, null, 2));
}
```

- [ ] **Step 2: Re-run state tests**

Run:
```bash
cd "/Users/firegroup/projects/claude-plugins/plugins/aio-gitlab-channel" && bun test __tests__/state.test.ts
```
Expected:
- existing 4 tests still PASS
- output contains `4 pass`

- [ ] **Step 3: Commit**

```bash
git -C "/Users/firegroup/projects/claude-plugins" add plugins/aio-gitlab-channel/shared/state.ts
git -C "/Users/firegroup/projects/claude-plugins" commit -m "feat: persist aio-gitlab-channel watcher state"
```

---

### Task 6: Build the MCP server with polling and diagnostics tools

**Files:**
- Create: `plugins/aio-gitlab-channel/server.ts`

- [ ] **Step 1: Write `server.ts`**

Create `plugins/aio-gitlab-channel/server.ts` with:

```ts
#!/usr/bin/env bun

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { formatPipelineEventMessage } from "./shared/format";
import { fetchFailureSummary, fetchLatestPipeline } from "./shared/gitlab";
import { detectPipelineEvent, loadWatcherState, nextWatcherState, saveWatcherState } from "./shared/state";
import type { PipelineFailureSummary, PipelineSnapshot, WatcherState } from "./shared/types";

const POLL_INTERVAL_MS = Number(process.env.AIO_GITLAB_CHANNEL_INTERVAL_MS ?? "10000");
const LOG_LEVEL = process.env.AIO_GITLAB_CHANNEL_LOG_LEVEL ?? "info";
const STATE_FILE = `${process.cwd()}/.aio-gitlab-channel-state.json`;

let watcherState: WatcherState = {};
let lastError = "";
let pollTimer: ReturnType<typeof setInterval> | null = null;

function log(message: string) {
  if (LOG_LEVEL !== "silent") {
    console.error(`[aio-gitlab-channel] ${message}`);
  }
}

async function buildFailureSummary(snapshot: PipelineSnapshot): Promise<PipelineFailureSummary | undefined> {
  if (snapshot.status !== "failed") {
    return undefined;
  }

  try {
    return await fetchFailureSummary(process.cwd(), snapshot.pipelineId);
  } catch (error) {
    log(`Failed to fetch failed-job summary: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

async function pollOnce(): Promise<{ changed: boolean; snapshot?: PipelineSnapshot; message?: string }> {
  try {
    const snapshot = await fetchLatestPipeline(process.cwd());
    const event = detectPipelineEvent(watcherState, snapshot);
    const failureSummary = await buildFailureSummary(snapshot);

    watcherState = nextWatcherState(watcherState, snapshot);
    await saveWatcherState(STATE_FILE, watcherState);
    lastError = "";

    if (!event) {
      return { changed: false, snapshot };
    }

    const message = formatPipelineEventMessage(event.type, snapshot, failureSummary);

    await mcp.notification({
      method: "notifications/claude/channel",
      params: {
        content: message,
        meta: {
          pipeline_id: String(snapshot.pipelineId),
          status: snapshot.status,
          ref: snapshot.ref,
          url: snapshot.webUrl ?? "",
        },
      },
    });

    log(`Sent channel notification: ${message}`);
    return { changed: true, snapshot, message };
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
    log(`Poll failed: ${lastError}`);
    return { changed: false };
  }
}

const mcp = new Server(
  { name: "aio-gitlab-channel", version: "0.1.0" },
  {
    capabilities: {
      experimental: { "claude/channel": {} },
      tools: {},
    },
    instructions: `You are connected to aio-gitlab-channel. This MCP server watches the latest GitLab pipeline for the repository in the current working directory by polling the glab CLI every 10 seconds. When a new pipeline appears or its status changes, it pushes a notifications/claude/channel event so Claude immediately learns that deploy activity started, succeeded, failed, or was canceled.

Available tools:
- status: Show watcher status, interval, cwd, last error, and last observed pipeline
- check_now: Perform an immediate poll and report whether anything changed
- last_pipeline: Show the last observed normalized pipeline snapshot

If the current directory is not a GitLab project or glab is not authenticated, the watcher logs errors to stderr and retries later without emitting fake channel events.`,
  },
);

const TOOLS = [
  {
    name: "status",
    description: "Show watcher status, interval, cwd, last error, and last observed pipeline.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "check_now",
    description: "Perform an immediate poll and report whether anything changed.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "last_pipeline",
    description: "Return the last observed normalized pipeline snapshot.",
    inputSchema: { type: "object", properties: {} },
  },
];

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  switch (req.params.name) {
    case "status":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                cwd: process.cwd(),
                pollIntervalMs: POLL_INTERVAL_MS,
                watcherRunning: Boolean(pollTimer),
                lastError,
                lastPipeline: watcherState.lastPipeline ?? null,
                lastPollAt: watcherState.lastPollAt ?? null,
              },
              null,
              2,
            ),
          },
        ],
      };
    case "check_now": {
      const result = await pollOnce();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
    case "last_pipeline":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(watcherState.lastPipeline ?? null, null, 2),
          },
        ],
      };
    default:
      throw new Error(`Unknown tool: ${req.params.name}`);
  }
});

async function main() {
  watcherState = await loadWatcherState(STATE_FILE);
  await mcp.connect(new StdioServerTransport());
  log(`MCP connected in ${process.cwd()}`);

  await pollOnce();
  pollTimer = setInterval(() => {
    void pollOnce();
  }, POLL_INTERVAL_MS);

  const cleanup = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main().catch((error) => {
  log(`Fatal: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
```

- [ ] **Step 2: Start the server directly to verify it parses**

Run:
```bash
cd "/Users/firegroup/projects/claude-plugins/plugins/aio-gitlab-channel" && timeout 3 bun server.ts
```
Expected:
- process starts
- logs an MCP startup line or poll failure line to stderr
- exits after timeout without TypeScript parse errors

- [ ] **Step 3: Run the full test suite**

Run:
```bash
cd "/Users/firegroup/projects/claude-plugins/plugins/aio-gitlab-channel" && bun test
```
Expected:
- all 12 tests PASS
- output contains `12 pass`

- [ ] **Step 4: Commit**

```bash
git -C "/Users/firegroup/projects/claude-plugins" add plugins/aio-gitlab-channel/server.ts
git -C "/Users/firegroup/projects/claude-plugins" commit -m "feat: implement aio-gitlab-channel MCP watcher server"
```

---

### Task 7: Write the skill and README documentation

**Files:**
- Create: `plugins/aio-gitlab-channel/skills/aio-gitlab-channel/SKILL.md`
- Create: `plugins/aio-gitlab-channel/README.md`

- [ ] **Step 1: Write `SKILL.md`**

Create `plugins/aio-gitlab-channel/skills/aio-gitlab-channel/SKILL.md` with:

````markdown
---
name: aio-gitlab-channel
description: Watch the latest GitLab pipeline for the current repository and push Claude channel notifications when deploy status changes. Use when needing GitLab pipeline awareness, deploy success/failure updates, glab-based pipeline watching, or hands-free CI status inside Claude Code. Triggers: "gitlab channel", "watch gitlab pipeline", "notify pipeline status", "deploy status from gitlab", "glab pipeline watcher".
when_to_use: gitlab channel, watch gitlab pipeline, notify pipeline status, deploy status from gitlab, glab pipeline watcher, gitlab deploy updates, ci status watcher
effort: medium
---

# aio-gitlab-channel

## What it does

Runs a Bun MCP server that polls `glab` every 10 seconds for the latest pipeline in the current repository. When a new pipeline appears or the latest pipeline changes status, it sends a Claude channel notification so the model learns that deploy activity started, succeeded, failed, or was canceled.

## Requirements

- `glab` installed
- `glab auth status` succeeds
- current `cwd` is a GitLab repository that `glab` can resolve

## Runtime

```bash
GITLAB_CHANNEL_ROOT="${CLAUDE_PLUGIN_ROOT}"
```

Main behavior:
- polls every 10 seconds by default
- watches only the current project in `cwd`
- emits notifications only for new pipelines or status changes
- adds a short failed-job summary when available

## Install and run

Install from the marketplace repo, then enable the plugin for the current project.

The plugin server is registered through `.mcp.json` and runs:

```bash
bun run --cwd "${CLAUDE_PLUGIN_ROOT}" --silent start
```

## What Claude receives

Examples:
- `GitLab pipeline #456 for main started`
- `GitLab pipeline #456 for main succeeded`
- `GitLab pipeline #456 for main failed — failed jobs: deploy_prod, smoke_test`

## Troubleshooting

Check auth:
```bash
glab auth status
```

Check latest pipeline manually:
```bash
glab ci list --per-page 1 --page 1 --output json
```

If no updates arrive:
- verify the current directory belongs to the intended GitLab project
- verify the latest pipeline is actually changing
- use the MCP `status` and `check_now` tools
- increase logs with `AIO_GITLAB_CHANNEL_LOG_LEVEL=debug`
````

- [ ] **Step 2: Write `README.md`**

Create `plugins/aio-gitlab-channel/README.md` with:

```markdown
# aio-gitlab-channel

GitLab pipeline status channel notifications for Claude Code using `glab`.

## What it does

`aio-gitlab-channel` watches the latest pipeline for the GitLab repository in the current working directory. It polls `glab` every 10 seconds and pushes Claude channel notifications only when:

- a new latest pipeline appears
- the latest pipeline changes status

This gives Claude passive awareness of deploy outcomes such as success, failure, running, or canceled.

## Requirements

- `glab` installed and available on `PATH`
- authenticated GitLab CLI session
- repository in the current `cwd` must be a GitLab project that `glab` can resolve

## Install

```bash
/plugin marketplace add aiocean/claude-plugins
/plugin install aio-gitlab-channel@aiocean-plugins
```

## Example notifications

- `GitLab pipeline #456 for main started`
- `GitLab pipeline #456 for main is running`
- `GitLab pipeline #456 for main succeeded`
- `GitLab pipeline #456 for main failed — failed jobs: deploy_prod, smoke_test`

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `AIO_GITLAB_CHANNEL_INTERVAL_MS` | `10000` | Poll interval override |
| `AIO_GITLAB_CHANNEL_LOG_LEVEL` | `info` | Logging verbosity |

## Troubleshooting

Check auth:

```bash
glab auth status
```

Inspect the latest pipeline manually:

```bash
glab ci list --per-page 1 --page 1 --output json
```

Run tests locally:

```bash
cd plugins/aio-gitlab-channel && bun test
```

Validate the marketplace entry from repo root:

```bash
bash scripts/validate-marketplace.sh
```
```

- [ ] **Step 3: Sanity-check the docs**

Run:
```bash
python3 - <<'PY'
from pathlib import Path
for path in [
    Path('/Users/firegroup/projects/claude-plugins/plugins/aio-gitlab-channel/skills/aio-gitlab-channel/SKILL.md'),
    Path('/Users/firegroup/projects/claude-plugins/plugins/aio-gitlab-channel/README.md'),
]:
    text = path.read_text()
    print(path.name, 'CLAUDE_PLUGIN_ROOT' in text or path.name == 'README.md', len(text.splitlines()))
PY
```
Expected:
- `SKILL.md True ...`
- `README.md True ...`

- [ ] **Step 4: Commit**

```bash
git -C "/Users/firegroup/projects/claude-plugins" add \
  plugins/aio-gitlab-channel/skills/aio-gitlab-channel/SKILL.md \
  plugins/aio-gitlab-channel/README.md
git -C "/Users/firegroup/projects/claude-plugins" commit -m "feat: document aio-gitlab-channel usage and troubleshooting"
```

---

### Task 8: Register the plugin in the marketplace and docs catalog

**Files:**
- Modify: `/Users/firegroup/projects/claude-plugins/.claude-plugin/marketplace.json`
- Modify: `/Users/firegroup/projects/claude-plugins/docs/index.html`

- [ ] **Step 1: Add the marketplace entry**

Insert this object into the `plugins` array in `.claude-plugin/marketplace.json`:

```json
{
  "name": "aio-gitlab-channel",
  "source": "./plugins/aio-gitlab-channel",
  "description": "GitLab pipeline status channel notifications via glab for the current repository.",
  "version": "0.1.0",
  "author": {
    "name": "aiocean"
  }
}
```

- [ ] **Step 2: Add the docs catalog entry**

In `docs/index.html`, add a plugin card entry near the other `aio-*` plugin definitions with:

```js
{ name: "aio-gitlab-channel", version: "0.1.0", desc: "GitLab pipeline status channel notifications via glab for the current repository." }
```

- [ ] **Step 3: Verify both registrations exist**

Run:
```bash
python3 - <<'PY'
import json
from pathlib import Path
market = json.loads(Path('/Users/firegroup/projects/claude-plugins/.claude-plugin/marketplace.json').read_text())
entry = next((p for p in market['plugins'] if p['name'] == 'aio-gitlab-channel'), None)
print('marketplace', bool(entry), entry['version'] if entry else None)
html = Path('/Users/firegroup/projects/claude-plugins/docs/index.html').read_text()
print('docs', 'aio-gitlab-channel' in html)
PY
```
Expected:
- `marketplace True 0.1.0`
- `docs True`

- [ ] **Step 4: Commit**

```bash
git -C "/Users/firegroup/projects/claude-plugins" add \
  .claude-plugin/marketplace.json \
  docs/index.html
git -C "/Users/firegroup/projects/claude-plugins" commit -m "feat: register aio-gitlab-channel in marketplace and docs"
```

---

### Task 9: Run repository validation and plugin smoke checks

**Files:**
- Modify: `plugins/aio-gitlab-channel/shared/gitlab.ts` (if validation finds command mismatches)
- Modify: `plugins/aio-gitlab-channel/skills/aio-gitlab-channel/SKILL.md` (if validation finds resolver issues)
- Modify: `plugins/aio-gitlab-channel/.mcp.json` (if startup wiring needs adjustment)

- [ ] **Step 1: Run the plugin test suite**

Run:
```bash
cd "/Users/firegroup/projects/claude-plugins/plugins/aio-gitlab-channel" && bun test
```
Expected:
- all local tests PASS
- output contains `12 pass`

- [ ] **Step 2: Run marketplace validation from repo root**

Run:
```bash
cd "/Users/firegroup/projects/claude-plugins" && bash scripts/validate-marketplace.sh
```
Expected:
- plugin `aio-gitlab-channel` passes all checks
- overall summary ends with `All checks passed!`

- [ ] **Step 3: Run a server startup smoke check**

Run:
```bash
cd "/Users/firegroup/projects/claude-plugins/plugins/aio-gitlab-channel" && timeout 3 bun server.ts
```
Expected:
- no TypeScript parse errors
- server starts and either logs MCP startup or a recoverable `glab`/project resolution failure

- [ ] **Step 4: Fix any validation failures immediately**

If `validate-marketplace.sh` reports a resolver, missing file, or registration failure, fix the exact file it names and re-run:

```bash
cd "/Users/firegroup/projects/claude-plugins" && bash scripts/validate-marketplace.sh
```
Expected: `All checks passed!`

- [ ] **Step 5: Commit the final validation-safe state**

```bash
git -C "/Users/firegroup/projects/claude-plugins" add \
  plugins/aio-gitlab-channel \
  .claude-plugin/marketplace.json \
  docs/index.html
git -C "/Users/firegroup/projects/claude-plugins" commit -m "feat: finalize aio-gitlab-channel marketplace plugin"
```

---

## Self-Review

### Spec coverage
- New plugin in `plugins/aio-gitlab-channel` — covered by Tasks 1, 6, 7, 8
- Bun MCP stdio server with `claude/channel` — covered by Task 6
- Poll `glab` every 10 seconds — covered by Task 6
- Watch latest pipeline in current `cwd` only — covered by Tasks 3 and 6
- Notify on new pipeline and status change only — covered by Tasks 2, 4, and 6
- Failed-job summary when available — covered by Tasks 3, 4, and 6
- Persist state to avoid duplicate replay after restart — covered by Task 5
- Marketplace + docs registration — covered by Task 8
- Validation and smoke testing — covered by Task 9

### Placeholder scan
- No `TODO`, `TBD`, or "similar to Task N" placeholders remain
- Every code-writing step includes concrete file content
- Every verification step includes an exact command and expected outcome

### Type consistency
- `PipelineSnapshot`, `PipelineFailureSummary`, `WatcherState`, and `PipelineEvent` are defined once in Task 2 and reused consistently
- `detectPipelineEvent`, `nextWatcherState`, `loadWatcherState`, and `saveWatcherState` are defined before `server.ts` uses them
- `formatPipelineEventMessage`, `fetchLatestPipeline`, and `fetchFailureSummary` are defined before server integration

---

Plan complete and saved to `docs/superpowers/plans/2026-04-03-aio-gitlab-channel.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
