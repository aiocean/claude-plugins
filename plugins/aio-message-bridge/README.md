::install-command
/plugin install aio-message-bridge@aiocean-plugins
::

# aio-message-bridge

Claude Code runs in a turn-by-turn loop. It has no event loop: it cannot listen on a socket, cannot block waiting for an external event, cannot react to something happening outside it mid-task. When a program in another terminal, a phone, a webhook from a SaaS, or a web page needs a live two-way channel to Claude *while a task is running*, the usual answers — polling, or stuffing everything into the chat — break down.

This plugin is the generic transport that gives Claude an event loop: one local relay fronting two channels, driven by the Monitor tool.

**External to Claude.** The external client makes a one-shot HTTP `POST /api/event`. The relay prints a single `MSG::{instance,type,payload}` line to stdout. The Monitor tool — already part of Claude Code — is watching that stdout and surfaces each line as a notification. That is how a turn-based agent receives "something happened outside" without polling or an event loop.

**Claude to external.** Claude makes an HTTP `POST /api/push` from any shell step. The relay broadcasts that JSON verbatim over WebSocket to every connected client.

The asymmetry is the whole point. Claude cannot hold a WebSocket open across turns, so WebSocket carries only the server→client push leg, while client→Claude rides plain HTTP into stdout where Monitor is already listening. Get it backwards — try to make Claude listen on a socket — and nothing works.

## When to use it

- An external process, device, or service needs a real-time two-way channel to Claude mid-task
- You want a webhook or event source to wake Claude when something happens
- A CLI in another terminal, a mobile app, or another program needs to send Claude events and receive pushes back
- You want to design your own message protocol over a dumb, language-agnostic relay

For building a Claude-authored **browser UI** on this pattern (a Vue 3 + Tailwind scaffold with a reactive runtime and built-in push types), use the **aio-html-interactive** skill in this plugin instead — it is one application of this transport.

Trigger phrases: "give Claude an event loop", "bridge external process to Claude", "Monitor WebSocket relay", "webhook wakes Claude", "two-way channel to Claude", "kết nối bên ngoài với Claude".

For the **aio-html-interactive** skill: "bridge Claude to a browser", "AI-driven UI", "interactive UI for AI", "realtime browser AI", "dựng UI tương tác AI".

## Install

```bash
/plugin install aio-message-bridge@aiocean-plugins
```

## What ships with it

- A generic, framework-free **reference relay** (`reference/bridge-server.js`, Bun, no deps) — a dumb pipe that never interprets your message types. Configurable via `BRIDGE_PREFIX`, `BRIDGE_PORT`, `BRIDGE_CLIENT`, `BRIDGE_HOST`, and `BRIDGE_TOKEN`. Localhost-only by default; set `BRIDGE_TOKEN` to expose it safely over a network (Cloudflare Tunnel, Tailscale, or LAN), where the token is required on every route.
- A minimal **vanilla-JS client** (`reference/client.html`) demonstrating both directions — WebSocket in, HTTP POST out — with an explicit busy-flag turn-taking pattern. Served by the relay at `GET /` so it is same-origin (no CORS).

The skill document explains the asymmetric two-channel pattern, the Monitor-tool wakeup mechanism, the full three-endpoint protocol, how to build a client in any language or platform (CLI, webhook, mobile, another program), and the design principles (typed vocabulary, single source of truth per state, turn-taking, localhost-only, lifecycle tied to the Monitor task).

## Requirements

- Bun installed (for the reference relay; the protocol itself is language-agnostic)
- Claude Code with the Monitor tool and TaskStop support
