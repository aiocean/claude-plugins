---
name: aio-patch-control
description: |
  Scaffold a reference HTTP control-channel gateway (sample shell clients + bun TUI) into <project>/control/, OR print the control-channel protocol docs. Reference example based on the dirty-claude project (Phase 1 patched binary exposes HTTP+SSE server on 127.0.0.1:$DC_PORT inside the running Claude). NOT a generic abstraction — adapt to your own transport (WebSocket / ZMQ / named pipes) if needed.
when_to_use: aio patch control, control channel, http control claude, claude as service, claude api server, scaffold control gateway, dirty claude control, agent as a service, claude HTTP server
argument-hint: "scaffold (default) | docs"
effort: medium
---

# aio-patch-control — HTTP control-channel reference + docs

## Goal

Drop a working sample gateway into `<project>/control/` so you can drive your patched claude binary over HTTP/SSE *if* your patches.json injects an HTTP server (the dirty-claude pattern). Also expose the protocol docs.

## Usage

```
/aio-claude-toolkit:aio-patch-control scaffold     # copy sample scripts into ./control/
/aio-claude-toolkit:aio-patch-control docs         # print docs/control-channel.md
FORCE=1 /aio-claude-toolkit:aio-patch-control scaffold   # overwrite existing ./control/
```

## What scaffold ships

- `control/simple-client.sh`, `raw-client.sh` — minimal curl-based clients
- `control/stream-client.sh`, `stream-text.sh`, `stream-ambient.sh` — SSE streaming variants
- `control/interactive-client.sh` — line-oriented driver
- `control/client.ts` — bun TUI (richer UX)
- `control/README.md` — quick reference

## Requires

- Scaffolded project (walk-up sentinel) — your patches.json must inject an HTTP control-channel for these clients to actually talk to the binary
- For bun TUI: `bun` installed

## Implementation

Invokes `${CLAUDE_PLUGIN_ROOT}/skills/aio-patch-control/scripts/control.sh "$@"`.
