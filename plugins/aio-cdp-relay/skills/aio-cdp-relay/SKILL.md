---
name: aio-cdp-relay
description: Interact with Chrome browser via a persistent CDP relay — navigate, capture network, read cookies, evaluate JS, take screenshots. No MCP tool calls, no approval prompts. Use when needing browser automation in scripts. Triggers: "cdp relay", "browser relay", "chrome relay", "capture network", "browser cookies cdp", "screenshot cdp", "evaluate js in browser".
---

# CDP Relay — Browser Automation Without MCP

## Environment

- go: !`go version 2>/dev/null | awk '{print $3}' || echo "NOT INSTALLED — install from https://go.dev/dl/"`
- binary: !`test -x /tmp/cdp-relay && echo "built (/tmp/cdp-relay)" || echo "NOT BUILT"`
- relay: !`curl -s http://127.0.0.1:9223/health 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'running (pid={d.get(\"pid\")}, connected={d.get(\"connected\")})')" 2>/dev/null || echo "NOT RUNNING"`
- websocket-client: !`python3 -c "import websocket; print('installed')" 2>/dev/null || echo "NOT INSTALLED — pip install websocket-client"`
- chrome: !`curl -s http://127.0.0.1:9223/targets 2>/dev/null | python3 -c "import json,sys; t=json.load(sys.stdin); pages=[x for x in t if x.get('type')=='page']; print(f'{len(pages)} tabs')" 2>/dev/null || echo "check chrome://inspect/#remote-debugging"`

```bash
CDP="${CLAUDE_PLUGIN_ROOT}/skills/aio-cdp-relay/scripts"
```

## Setup (first time)

### 1. Install Go (if `go` check above shows NOT INSTALLED)

Tell the user to install Go from https://go.dev/dl/ or via their package manager:
```bash
# macOS:
brew install go
# Linux:
sudo apt install golang-go
```

### 2. Build the relay binary (if `binary` check above shows NOT BUILT)

Tell the user to run:
```bash
cd "${CLAUDE_PLUGIN_ROOT}/skills/aio-cdp-relay/scripts/relay-go" && go build -o /tmp/cdp-relay .
```

### 3. Enable Chrome remote debugging

Tell the user to open Chrome and go to `chrome://inspect/#remote-debugging` (one-time, persists until Chrome restart).

### 4. Install websocket-client (if check above shows NOT INSTALLED)

```bash
pip install websocket-client
```

## Relay Server

The relay server must be started manually and runs persistently (no idle timeout). It auto-reconnects to Chrome if the connection drops.

### Start the relay server (if `relay` check above shows NOT RUNNING)

Tell the user to run:
```bash
nohup /tmp/cdp-relay > /tmp/cdp_relay.log 2>&1 &
```

### Stop the relay server

```bash
curl -X POST http://127.0.0.1:9223/stop
# Or: kill $(cat /tmp/cdp_relay.pid)
```

## How It Works

A persistent HTTP relay holds one WebSocket to Chrome. Scripts talk to the relay — no new connections, no MCP approval prompts.

```
Script ──HTTP──▶ CDP Relay (:9223) ──WS──▶ Chrome
```

- Runs persistently until explicitly stopped
- Auto-reconnects to Chrome if WebSocket drops
- Scripts can start/stop freely without reconnecting
- All CDP commands available: navigation, network, cookies, DOM, screenshots, JS eval

## CLI Tool

```bash
python3 "$CDP/cdp_tool.py" status              # Relay & Chrome status
python3 "$CDP/cdp_tool.py" targets             # List browser tabs
python3 "$CDP/cdp_tool.py" cookies https://example.com  # Get cookies
python3 "$CDP/cdp_tool.py" eval "document.title"        # Run JS in active tab
python3 "$CDP/cdp_tool.py" screenshot /tmp/page.png     # Screenshot
python3 "$CDP/cdp_tool.py" navigate https://example.com # Navigate
python3 "$CDP/cdp_tool.py" network 10          # Capture network for 10s
python3 "$CDP/cdp_tool.py" stop                # Stop relay
```

## Python Client Library

For reusable scripts, import `cdp_client.py`:

```python
import sys
sys.path.insert(0, "<CLAUDE_PLUGIN_ROOT>/skills/aio-cdp-relay/scripts")
from cdp_client import CDPClient

with CDPClient() as cdp:
    # Find and attach to a tab
    tab = cdp.find_tab(url_contains="admin.shopify.com")
    cdp.attach(tab["targetId"])

    # Navigate
    cdp.navigate("https://example.com")

    # Evaluate JS
    title = cdp.evaluate("document.title")

    # Cookies
    cookies = cdp.cookies(["https://example.com"])

    # Network capture
    cdp.network_enable()
    cdp.reload()
    events = cdp.wait_events(timeout=8)
    reqs = cdp.network_requests(events)

    # Find specific request + extract headers
    req = cdp.find_request(events, url_contains="api.example.com")
    auth = req["headers"].get("Authorization", "") if req else ""

    # Screenshot
    cdp.screenshot("/tmp/page.png", full_page=True)

    # Viewport
    cdp.set_viewport(width=1440, height=900)
```

## Client API Reference

### Lifecycle

| Method | Description |
|--------|-------------|
| `CDPClient(port=9223)` | Create client (relay must already be running) |
| `cdp.stop_relay()` | Gracefully stop relay |

### Targets

| Method | Description |
|--------|-------------|
| `cdp.targets(type="page")` | List targets, filter by type |
| `cdp.find_tab(url_contains=..., title_contains=...)` | Find tab by URL/title |
| `cdp.attach(target_id)` | Attach to target, returns session_id |
| `cdp.detach()` | Detach from current session |

### Navigation

| Method | Description |
|--------|-------------|
| `cdp.navigate(url, wait=3)` | Navigate and wait |
| `cdp.reload(ignore_cache=True, wait=3)` | Reload page |
| `cdp.evaluate(js)` | Evaluate JS, return value |
| `cdp.evaluate_async(js)` | Evaluate async JS (awaits promise) |

### Network

| Method | Description |
|--------|-------------|
| `cdp.network_enable()` | Start capturing network events |
| `cdp.network_disable()` | Stop capturing |
| `cdp.wait_events(timeout=5)` | Wait then drain events |
| `cdp.drain_events()` | Drain events immediately |
| `cdp.network_requests(events)` | Extract requests from events |
| `cdp.find_request(events, url_contains)` | Find request by URL |

### Cookies

| Method | Description |
|--------|-------------|
| `cdp.cookies(urls=["..."])` | Get cookies for URLs |
| `cdp.set_cookie(name, value, domain)` | Set a cookie |
| `cdp.clear_cookies()` | Clear all cookies |

### Visual

| Method | Description |
|--------|-------------|
| `cdp.screenshot(path, full_page=False)` | Capture screenshot |
| `cdp.set_viewport(width, height)` | Set viewport size |

### DOM

| Method | Description |
|--------|-------------|
| `cdp.get_document()` | Get root DOM node |
| `cdp.query_selector(selector)` | Find element by CSS |
| `cdp.get_outer_html(node_id)` | Get element HTML |

### Raw CDP

| Method | Description |
|--------|-------------|
| `cdp.send(method, params, timeout)` | Send any CDP command |

## Relay HTTP API (for non-Python scripts)

Any language can talk to the relay via HTTP:

```bash
# Health check
curl http://127.0.0.1:9223/health

# List targets
curl http://127.0.0.1:9223/targets

# Send CDP command
curl -X POST http://127.0.0.1:9223/cdp \
  -H 'Content-Type: application/json' \
  -d '{"method":"Runtime.evaluate","params":{"expression":"1+1","returnByValue":true},"sessionId":"..."}'

# Drain events
curl "http://127.0.0.1:9223/events?sessionId=..."

# Stop relay
curl -X POST http://127.0.0.1:9223/stop
```

## Common Patterns

### Capture auth token from network requests

```python
with CDPClient() as cdp:
    tab = cdp.find_tab(url_contains="admin.shopify.com")
    cdp.attach(tab["targetId"])
    cdp.network_enable()
    cdp.reload()
    events = cdp.wait_events(timeout=10)
    req = cdp.find_request(events, url_contains="merchant-analytics")
    if req:
        auth = req["headers"].get("Authorization", "")
        print(f"Token: {auth[:50]}...")
```

### Run fetch() in page context

```python
with CDPClient() as cdp:
    cdp.attach(cdp.targets(type="page")[0]["targetId"])
    data = cdp.evaluate_async("""
        (async () => {
            const resp = await fetch('/api/data');
            return await resp.json();
        })()
    """)
```

### Multi-tab workflow

```python
with CDPClient() as cdp:
    tabs = cdp.targets(type="page")

    # Work with tab 1
    cdp.attach(tabs[0]["targetId"])
    title1 = cdp.evaluate("document.title")
    cdp.detach()

    # Work with tab 2
    cdp.attach(tabs[1]["targetId"])
    title2 = cdp.evaluate("document.title")
    cdp.detach()
```

## Prerequisites

1. Go installed (`go version` — install from https://go.dev/dl/)
2. Relay binary built (`go build -o /tmp/cdp-relay .` in relay-go dir)
3. Chrome with remote debugging: `chrome://inspect/#remote-debugging`
4. `pip install websocket-client` (for Python client/CLI tool)
5. Relay server running with `nohup` (see "Start the relay server" above)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Relay not running | Start with `nohup` command above |
| No tabs found | Open at least one page in Chrome |
| Connection refused | Chrome may have restarted — relay auto-reconnects within ~3s |
| Events empty | Call `network_enable()` before navigation, increase `wait_events` timeout |
| Check relay logs | `tail -f /tmp/cdp_relay.log` |
