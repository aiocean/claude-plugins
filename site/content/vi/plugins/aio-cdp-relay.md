---
title: "aio-cdp-relay"
description: "CDP (Chrome DevTools Protocol) relay bền vững để automation browser qua script — không cần MCP tool call, không có approval prompt."
document_type: "plugin"
version: "1.3.1"
install: "/plugin install aio-cdp-relay@aiocean-plugins"
skills_count: 1
---

> **Cài đặt:** `/plugin install aio-cdp-relay@aiocean-plugins` · `v1.3.1`

# aio-cdp-relay

CDP (Chrome DevTools Protocol) relay bền vững cho Claude Code. Tương tác với Chrome browser qua script — không cần MCP tool call, không có approval prompt cho từng action.

## Cài đặt

```bash
/plugin install aio-cdp-relay@aiocean-plugins
```

## Cách hoạt động

Một process HTTP relay nhẹ giữ một WebSocket connection duy nhất tới Chrome. Script nói chuyện với relay qua `http://127.0.0.1:9223` — relay forward CDP command và buffer event. Auto-start lần đầu sử dụng, auto-terminate sau 5 phút idle.

```
Script ──HTTP──▶ CDP Relay ──WebSocket──▶ Chrome
Script ◀─HTTP── CDP Relay ◀──WebSocket── Chrome
```

## Tại sao

- **Không có MCP approval prompt** — script dùng HTTP, không phải MCP tool
- **Một connection duy nhất** — relay giữ một WebSocket, script connect/disconnect tự do
- **Scriptable** — viết Python script tái sử dụng để tương tác với browser
- **Auto-lifecycle** — tự khởi động, tự tắt sau 5 phút idle

## Yêu cầu

- Chrome với remote debugging được bật (`chrome://inspect/#remote-debugging`)
- python3
- websocket-client (`pip install websocket-client`)

## Skills (1)

- [**aio-cdp-relay**](/vi/plugins/aio-cdp-relay/aio-cdp-relay) — Tương tác với Chrome browser qua CDP relay bền vững — navigate, capture network, đọc cookie, evaluate JS, chụp screenshot. Không có MCP tool call, không có approval…
