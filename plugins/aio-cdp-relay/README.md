# aio-cdp-relay

Persistent Chrome DevTools Protocol relay for Claude Code. Interact with Chrome browser via scripts — no MCP tool calls needed, no approval prompts per action.

## Install

```bash
/plugin install aio-cdp-relay@aiocean-plugins
```

## How It Works

A lightweight HTTP relay process maintains a single WebSocket connection to Chrome. Scripts talk to the relay via `http://127.0.0.1:9223` — the relay forwards CDP commands and buffers events. Auto-starts on first use, auto-terminates after 5 minutes idle.

```
Script ──HTTP──▶ CDP Relay ──WebSocket──▶ Chrome
Script ◀─HTTP── CDP Relay ◀──WebSocket── Chrome
```

## Why

- **No MCP approval prompts** — scripts use HTTP, not MCP tools
- **Single connection** — relay holds one WebSocket, scripts connect/disconnect freely
- **Scriptable** — write reusable Python scripts that interact with the browser
- **Auto-lifecycle** — starts automatically, dies after 5 min idle

## Requirements

- Chrome with remote debugging enabled (`chrome://inspect/#remote-debugging`)
- python3
- websocket-client (`pip install websocket-client`)
