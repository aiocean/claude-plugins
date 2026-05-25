---
name: aio-html-interactive
description: |
  Bridge Claude to a browser UI in real time. The technical problem: Claude
  runs in a turn-by-turn CLI loop with no event loop — it cannot
  addEventListener on a tab, cannot block on user input. This skill ships a
  frozen Bun + Vue3 + Tailwind scaffold that solves it via two channels:
  browser events become Monitor-tool notifications (server emits MSG:: lines
  to stdout, Monitor pattern-matches → Claude wakes), AI pushes become
  WebSocket broadcasts (POST /api/push → all browser tabs). Claude only
  writes the APP REGION of app.html; the runtime, message protocol, and
  vendor blocks are frozen. Use when an interactive browser UI must be driven
  by Claude while a task is in progress — form capture, multi-step decision
  flow, live preview, approval queue, side-by-side review. Triggers:
  "/aio-html-interactive", "/interactive", "interactive UI for AI",
  "browser ↔ AI realtime", "AI-driven UI", "Monitor + WebSocket bridge",
  "làm cái UI tương tác với AI", "dựng UI tương tác", "realtime browser AI".
when_to_use: bridge Claude to browser, AI event loop substitute, Monitor stdout to notification, WebSocket push from AI, AI-driven UI, interactive UI for AI, realtime browser AI, browser to AI bidirectional, dựng UI tương tác AI, làm UI tương tác AI
argument-hint: "[slug for /tmp dir, e.g. 'picker' or 'review-queue']"
effort: medium
---

# aio-html-interactive — bridge Claude to a browser via Monitor + WebSocket

## The problem this solves

Claude runs in a turn-by-turn CLI loop. It has no event loop, can't
`addEventListener` on a browser, can't block on `await userClick()`. So
how does an interactive UI — one the user is actually clicking on right
now — drive Claude's behavior while a task is in progress?

The answer two channels, both fronted by a single Bun HTTP + WebSocket
server:

- **Browser → Claude (input channel).** `RT.send(type, payload)` in the
  browser POSTs `/api/event`; the server writes one line
  `MSG::{instance,type,payload}` to stdout. The **Monitor tool** is
  configured to pattern-match `MSG::` lines on that server's stdout and
  surface each one as a notification. Notifications are how a turn-based
  agent gets a "user-clicked-X" event without an event loop.
- **Claude → browser (output channel).** Claude POSTs
  `/api/push {type,payload}` from any shell tool call; the server
  broadcasts that JSON verbatim over WebSocket to every connected tab.
  The runtime processes a small built-in vocabulary (`state` merge,
  `toast`, `html`, `js`, `reload`) before dispatching to
  app-registered handlers.

UI is vendored Vue 3 + Tailwind, no build step. Claude only writes the
**APP REGION** of `app.html`; the runtime, server, and vendor blocks
are frozen so the protocol stays intact across edits.

## Workflow

1. **Copy scaffold** —
   `cp -r ${CLAUDE_PLUGIN_ROOT}/skills/aio-html-interactive/scaffold /tmp/aio-html-interactive-<slug>`
   via Bash. Do not Read+Write to copy — that round-trips through the
   model and risks editing the runtime by accident.

2. **Build app** — `Read` `/tmp/aio-html-interactive-<slug>/app.html`
   once before editing. The Edit tool requires a prior in-conversation
   `Read`; the `cp` above does NOT count, so skipping `Read` makes the
   first `Edit` fail with `File has not been read yet`. Read with
   `offset`/`limit` around the two markers (~25 lines at end of file) is
   enough. Edit ONLY the text between
   `<!-- ===== APP REGION START ... -->` and
   `<!-- ===== APP REGION END ===== -->`, using both marker lines as
   `Edit` anchors. Never rewrite the whole file. Never touch the runtime
   block, `server.js`, or `vendor/` — and do not Read them either; the
   full API is documented below.

3. **Launch** — run `bun /tmp/aio-html-interactive-<slug>/server.js`
   through the Monitor tool. The startup line prints URL + `instance`
   id; the browser opens automatically.

4. **Interact** — browser events arrive as Monitor notifications:
   `MSG::{instance,type,payload}`. Claude pushes back with
   `curl -s -X POST http://localhost:<PORT>/api/push -d '{"type":"...","payload":{...}}'`.

5. **Cleanup (required)** — when done: `TaskStop` the Monitor task AND
   `rm -rf /tmp/aio-html-interactive-<slug>`. Leaving the task running
   holds the port; leaving the directory is litter.

## Server API

- `POST /api/push` `{type,payload}` — Claude → browser. Server
  broadcasts the JSON verbatim over WebSocket to every connected tab.
- `POST /api/event` `{type,payload}` — browser → Claude. `RT.send()`
  calls this; server writes `MSG::{instance,type,payload}` to stdout.
  Monitor surfaces each line as a notification.
- `MSG::` stdout line — JSON after the prefix; `instance` disambiguates
  when multiple `aio-html-interactive` apps run concurrently. The
  prefix is the Monitor-side contract — do not change it.

## Runtime API (browser-side)

- `RT.start(appDef)` — the only entry point the APP REGION calls (last,
  exactly once). `appDef` is a Vue component options object: `template`,
  `setup`, etc. The runtime injects `state` / `send` / `on` into the
  render scope; values returned from `setup()` merge on top.
- `RT.state` — reactive global state (`Vue.reactive`). Template reads
  `state.*`.
- `RT.send(type, payload)` — emit a browser → Claude event
  (POSTs `/api/event`).
- `RT.on(type, fn)` — register a handler for a custom push `type`
  (non-built-in).
- **Template** reads `state` / `send` / `on` directly (runtime returns
  them into the render scope). **Inside `setup()`** they are NOT visible
  — there, address them as `RT.state` / `RT.send` / `RT.on` (they are
  runtime closures, not globals; bare `send(...)` inside `setup()`
  throws `ReferenceError`).

## Built-in push types

`POST /api/push` with these `type` values is handled by the runtime
directly (before app-registered handlers; an app handler cannot shadow
these):

| `type` | `payload` | Effect |
|---|---|---|
| `state` | object | **Shallow-merge** into `RT.state` → Vue re-renders. Primary UI-update mechanism. |
| `state-set` | object | Full replace — clear `RT.state` then assign payload. |
| `toast` | `{kind,text}` | Toast notification. `kind`: `ok` (green, auto-dismiss ~4s) / `err` (red) / `held` (amber) / `info` (gray). |
| `html` | `{target,mode,html}` | `querySelector(target)`; `mode:"append"` appends, anything else replaces `innerHTML`. Missing target → `toast err`. |
| `js` | `{code}` | Eval the `code` string (escape hatch). Errors → `toast err` (never silent). |
| `reload` | — | `location.reload()`. |

Any other `type` → invokes the handler registered via `RT.on()`; no
handler → silently ignored.

## Design principles

- **Drive UI through `state`.** Push a `state` patch; let Vue
  reactivity re-render. Prefer this over `html` / `js`, which are
  escape hatches.
- **Bake initial state in `setup()` when Claude already has it.** If
  Claude holds the initial dataset at the time of writing the app
  (list, table, config…), seed it directly into `RT.state` inside
  `setup()` so first paint is complete. Use `push state` for
  *subsequent updates only*. Launching the server and then pushing
  initial state is a wasted round-trip with a blank-flash for the user.
- **Single writer per `state` key.** Either the app writes locally
  (optimistic) OR Claude `push state` writes — never both for the same
  key. Both writing → last-writer-wins race, value flickers. Pick a
  model: *Claude-authoritative* (browser clicks only `send()`, only
  Claude pushes — no race but adds latency) or *browser-authoritative*
  (app writes local, Claude reads events but does not push that key).
- **Define a small, explicit message vocabulary.** A handful of `type`
  values for browser → Claude, a handful for Claude → browser. Spell
  them out at the top of the APP REGION.
- **Explicit submission + busy flag.** Claude turn-takes asynchronously
  and can take seconds; `send()` is fire-and-forget. Do NOT fire
  `send()` on every micro-interaction (every keystroke) and leave the
  user blind — they cannot tell whether Claude received the event, is
  processing, or whether further input is allowed. Collect input into
  local `state`, give the user an explicit **"Send to AI"** button, set
  a pending flag (e.g. `state.busy = true`) on submit so the UI shows
  "waiting for AI…" and/or disables input, and have Claude push `state`
  to clear the flag when done. The feedback loop must stay closed — the
  user always knows whose turn it is.

## Starter — APP REGION skeleton (optional)

The skeleton below follows the design principles above: header,
centered container, explicit "Send to AI" button, `state.busy` flag,
initial state baked in `setup()`. Copy over the placeholder content and
replace the body. Head-start only — different layouts are fine, this is
not required.

```html
RT.start({
  template: `
    <div class="min-h-screen pb-24">

      <!-- header — app title + one-line description -->
      <div class="bg-slate-900 text-white">
        <div class="max-w-3xl mx-auto px-6 py-5">
          <h1 class="text-lg font-semibold">{{ state.title }}</h1>
          <p class="text-slate-400 text-sm mt-0.5">{{ state.subtitle }}</p>
        </div>
      </div>

      <!-- main content — replace this block with the real app -->
      <div class="max-w-3xl mx-auto px-6 py-6">
        <div class="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-600">
          App content here.
        </div>
      </div>

      <!-- action bar — explicit Send button, locked while waiting on AI -->
      <div class="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200">
        <div class="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">
          <div class="flex-1 text-sm text-slate-500">
            {{ state.busy ? '⏳ Waiting for AI…' : 'Ready.' }}
          </div>
          <button @click="submit" :disabled="state.busy"
              class="px-5 py-2 rounded-lg text-sm font-semibold text-white
                     bg-slate-900 hover:bg-slate-700 disabled:opacity-40">
            Send to AI →
          </button>
        </div>
      </div>

    </div>
  `,
  setup() {
    // Bake initial state — first paint is complete, no blank-flash.
    RT.state.title = "App title";
    RT.state.subtitle = "One-line description";
    RT.state.busy = false;

    // Browser → AI: commit the submission and raise the busy flag so the
    // UI locks itself.
    function submit() {
      if (RT.state.busy) return;
      RT.state.busy = true;
      RT.send("submit", {});
    }

    // AI → browser: on completion, AI pushes {"type":"done"} to release
    // the busy flag.
    RT.on("done", function () {
      RT.state.busy = false;
    });

    return { submit: submit };
  },
});
```

## Lifecycle

Server lifetime is tied to the Monitor task. `TaskStop` terminates the
Bun process, which closes every WebSocket; subsequent browser actions
silently fail (no handler reachable). The `/tmp/aio-html-interactive-<slug>/`
directory is Claude's responsibility to remove after `TaskStop` —
see step 5 of the workflow.
