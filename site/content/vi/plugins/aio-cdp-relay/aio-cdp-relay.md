---
title: "aio-cdp-relay"
description: "Interact with Chrome browser via a persistent CDP relay — navigate, capture network, read cookies, evaluate JS, take screenshots. No MCP tool calls, no approval prompts."
document_type: "skill"
plugin: "aio-cdp-relay"
install: "/plugin install aio-cdp-relay@aiocean-plugins"
---

> From plugin [**aio-cdp-relay**](/vi/plugins/aio-cdp-relay) · `v1.3.1` · **Install:** `/plugin install aio-cdp-relay@aiocean-plugins`

# CDP Relay — Browser Automation Without MCP

## Environment

- go: !`go version 2>/dev/null | awk '{print $3}' || echo "NOT INSTALLED — install from https://go.dev/dl/"`
- binary: !`command -v cdp-relay >/dev/null 2>&1 && echo "installed ($(which cdp-relay))" || (test -x /tmp/cdp-relay && echo "built (/tmp/cdp-relay)" || echo "NOT INSTALLED — run go install in relay-go dir")`
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

### 2. Build and install the relay binary globally (if `binary` check above shows NOT BUILT)

The relay server should be installed globally so it's available system-wide across all projects:

```bash
cd "${CLAUDE_PLUGIN_ROOT}/skills/aio-cdp-relay/scripts/relay-go" && go install .
```

This installs `cdp-relay` to `$GOPATH/bin` (typically `~/go/bin`). Make sure `$GOPATH/bin` is in your `$PATH`.

Alternatively, build to a fixed location:
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
# If installed globally:
nohup cdp-relay > /tmp/cdp_relay.log 2>&1 &
# Or if built locally:
nohup /tmp/cdp-relay > /tmp/cdp_relay.log 2>&1 &
```

### Stop the relay server

```bash
curl -X POST http://127.0.0.1:9223/stop
# Or: kill $(cat /tmp/cdp_relay.pid)
```

### Restart the relay server (rebuild + restart)

```bash
python3 "$CDP/cdp_tool.py" restart
```

This rebuilds the binary from source (`go install`), kills the running relay, and starts a fresh one. Useful after upgrading the relay code.

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
python3 "$CDP/cdp_tool.py" restart             # Rebuild, kill, restart relay
```

## Python Client Library

For reusable scripts, import `cdp_client.py`:

```python
import sys
sys.path.insert(0, "<CLAUDE_PLUGIN_ROOT>/skills/aio-cdp-relay/scripts")
from cdp_client import CDPClient

with CDPClient() as cdp:
    # Auto-attach to a tab by URL pattern (relay caches the session)
    cdp.use_tab(url="*admin.shopify.com*")

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

### Targets (auto-attach)

| Method | Description |
|--------|-------------|
| `cdp.use_tab(url="*pattern*")` | **Recommended.** Auto-attach by URL/title glob pattern. Relay caches session. |
| `cdp.use_tab(title="*pattern*")` | Auto-attach by title pattern |
| `cdp.use_tab(target_id="...")` | Auto-attach by exact target ID |
| `cdp.targets(type="page")` | List targets, filter by type |
| `cdp.find_tab(url_contains=..., title_contains=...)` | Find tab by URL/title (client-side) |
| `cdp.attach(target_id)` | Manual attach to target, returns session_id |
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

### Event Filtering

| Method | Description |
|--------|-------------|
| `cdp.subscribe(["Network.*", "Page.loadEventFired"])` | Only buffer matching events |
| `cdp.unsubscribe()` | Revert to buffering all events |

### Network Interception

| Method | Description |
|--------|-------------|
| `cdp.intercept([{"urlPattern": "*api*", "action": "log"}])` | Start intercepting matching requests |
| `cdp.intercepted()` | Get and clear captured requests |
| `cdp.stop_intercept()` | Stop intercepting |

Intercept actions:
- `"log"` — capture request details, let it continue normally
- `"block"` — reject the request (BlockedByClient)
- `"mock"` — return a fake response (set `mockStatus`, `mockBody`, `mockHeaders`)

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

# Auto-attach to a tab by URL pattern — returns sessionId
curl -X POST http://127.0.0.1:9223/attach \
  -H 'Content-Type: application/json' \
  -d '{"url": "*github*"}'

# Send CDP command with auto-attach (no manual sessionId needed)
curl -X POST http://127.0.0.1:9223/cdp \
  -H 'Content-Type: application/json' \
  -d '{"method":"Runtime.evaluate","params":{"expression":"document.title","returnByValue":true},"targetSelector":{"url":"*github*"}}'

# Send CDP command with explicit sessionId
curl -X POST http://127.0.0.1:9223/cdp \
  -H 'Content-Type: application/json' \
  -d '{"method":"Runtime.evaluate","params":{"expression":"1+1","returnByValue":true},"sessionId":"..."}'

# Subscribe to specific events only
curl -X POST http://127.0.0.1:9223/subscribe \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"...","events":["Network.*","Page.loadEventFired"]}'

# Drain events
curl "http://127.0.0.1:9223/events?sessionId=..."

# Intercept network requests
curl -X POST http://127.0.0.1:9223/intercept \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"...","rules":[{"urlPattern":"*api*","action":"log"}]}'

# Get intercepted requests
curl http://127.0.0.1:9223/intercepted

# Stop intercepting
curl -X DELETE "http://127.0.0.1:9223/intercept?sessionId=..."

# Stop relay
curl -X POST http://127.0.0.1:9223/stop
```

## Common Patterns

### Capture auth token from network requests

```python
with CDPClient() as cdp:
    cdp.use_tab(url="*admin.shopify.com*")
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
    cdp.use_tab(url="*example.com*")
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
    # Switch tabs by URL pattern — relay caches sessions per target
    cdp.use_tab(url="*github*")
    title1 = cdp.evaluate("document.title")

    cdp.use_tab(url="*docs*")
    title2 = cdp.evaluate("document.title")
```

### Intercept and log API calls

```python
with CDPClient() as cdp:
    cdp.use_tab(url="*myapp*")
    cdp.intercept([{"urlPattern": "*api*", "action": "log"}])
    cdp.reload()
    import time; time.sleep(5)
    reqs = cdp.intercepted()
    for r in reqs:
        print(f"  {r['method']} {r['url']}")
    cdp.stop_intercept()
```

### Block analytics / ads

```python
with CDPClient() as cdp:
    cdp.use_tab(url="*myapp*")
    cdp.intercept([
        {"urlPattern": "*google-analytics*", "action": "block"},
        {"urlPattern": "*doubleclick*", "action": "block"},
    ])
    cdp.reload()
```

### Mock an API response

```python
with CDPClient() as cdp:
    cdp.use_tab(url="*myapp*")
    cdp.intercept([{
        "urlPattern": "*api/users*",
        "action": "mock",
        "mockStatus": 200,
        "mockBody": '{"users": [{"name": "Test User"}]}',
        "mockHeaders": {"Content-Type": "application/json"},
    }])
    cdp.reload()
```

### Filter events to reduce noise

```python
with CDPClient() as cdp:
    cdp.use_tab(url="*myapp*")
    cdp.subscribe(["Network.responseReceived", "Page.loadEventFired"])
    cdp.network_enable()
    cdp.reload()
    events = cdp.wait_events(timeout=5)
    # Only Network.responseReceived and Page.loadEventFired are returned
    cdp.unsubscribe()
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
| Connection refused | Chrome may have restarted — relay auto-reconnects with backoff (1s → 30s max) |
| Events empty | Call `network_enable()` before navigation, increase `wait_events` timeout |
| Check relay logs | `tail -f /tmp/cdp_relay.log` |
