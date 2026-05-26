# aio-html-interactive

Claude operates in a turn-by-turn loop. It has no event loop, cannot listen for a button click, cannot block waiting for user input mid-task. When a task genuinely needs a UI — a form to collect structured input, a list for the user to approve or reject items, a side-by-side review panel, a multi-step decision flow — the usual answer is to embed everything in the chat conversation. That works for simple cases but breaks down when the interaction is spatial, iterative, or requires the user to work through multiple states before Claude proceeds.

This plugin solves the missing event loop with two channels and a frozen scaffold:

**Browser to Claude.** The user interacts with a Vue 3 UI running in their browser. Every user action calls `RT.send(type, payload)`, which POSTs to a local Bun server. The server writes a `MSG::` line to stdout. The Monitor tool — already part of Claude Code — is watching that stdout and surfaces each line as a notification. This is how a turn-based agent receives "user clicked approve" without polling.

**Claude to browser.** Claude calls `curl -X POST /api/push` from any shell step. The server broadcasts that JSON over WebSocket to every connected tab. The runtime handles a small built-in vocabulary (`state` for reactive UI updates, `toast` for notifications, `html` and `js` as escape hatches, `reload`). Everything else goes to app-registered handlers.

The scaffold — Bun server, Vue 3 + Tailwind vendor files, runtime bridge — is frozen. Claude only edits the APP REGION of `app.html`, bounded by two comment markers. The protocol stays intact no matter what the app does.

## When to use it

- You need the user to fill out a structured form before Claude can proceed
- You are presenting a list of items for approval, rejection, or ranking
- You want live preview of something Claude is generating (a config, a document structure, a sequence of steps)
- The task has multiple decision points where user judgment is required mid-execution, not just at the end
- You want to show the user something spatial that prose in the chat cannot represent cleanly

Trigger phrases: "bridge Claude to browser", "AI-driven UI", "Monitor WebSocket bridge", "interactive UI for AI", "realtime browser AI", "browser to AI bidirectional".

## Install

```bash
/plugin install aio-html-interactive@aiocean-plugins
```

## How Claude uses it

1. Copy the scaffold to a temporary directory with a slug for disambiguation.
2. Read `app.html` once (required before Edit can modify it).
3. Write the Vue component into the APP REGION only — never touch the runtime block, server, or vendor files.
4. Launch `server.js` via the Monitor tool. The startup line prints the URL; the browser opens automatically.
5. Receive browser events as `MSG::{instance,type,payload}` Monitor notifications. Push back with `curl /api/push`.
6. When the interaction is complete: stop the Monitor task, remove the temporary directory.

The skill document contains the full server API, the complete runtime API (`RT.state`, `RT.send`, `RT.on`), the built-in push type vocabulary, design principles, and an annotated starter skeleton with a busy-flag pattern to keep the user informed while Claude is processing.

## Design principles encoded in the scaffold

Drive UI through `state` patches rather than raw `html` or `js` injection — Vue reactivity re-renders correctly and predictably. Bake initial data into `setup()` so the first paint is complete rather than blank. Keep a single writer per state key to avoid last-writer-wins races. Give the user an explicit submit button with a visible busy state so they always know whose turn it is.

## Requirements

- Bun installed
- Claude Code with Monitor tool and TaskStop support
